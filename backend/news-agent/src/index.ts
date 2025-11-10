import { Kafka, Consumer, Producer, CompressionTypes, CompressionCodecs } from 'kafkajs';
import SnappyCodec from 'kafkajs-snappy';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Register Snappy codec
CompressionCodecs[CompressionTypes.Snappy] = SnappyCodec;

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Logger
const log = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// Gemini AI
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Kafka
const kafka = new Kafka({
  clientId: 'news-agent',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'news-agent-group' });
const producer = kafka.producer();

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';

/**
 * Fetch news from Finnhub
 */
async function fetchNews(symbol?: string, category?: string) {
  try {
    const url = symbol 
      ? `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${getDateDaysAgo(7)}&to=${getDateToday()}&token=${FINNHUB_API_KEY}`
      : `https://finnhub.io/api/v1/news?category=${category || 'general'}&token=${FINNHUB_API_KEY}`;
    
    const response = await axios.get(url);
    return response.data.slice(0, 10); // Limit to 10 news items
  } catch (error: any) {
    log('❌ Error fetching news from Finnhub', { error: error.message });
    return [];
  }
}

function getDateToday() {
  return new Date().toISOString().split('T')[0];
}

function getDateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Analyze sentiment using Gemini
 */
async function analyzeSentiment(headline: string, summary: string) {
  const prompt = `Analyze the sentiment of this financial news:

Headline: ${headline}
Summary: ${summary}

Respond with ONLY ONE WORD: positive, negative, or neutral.`;
  
  try {
    const result = await model.generateContent(prompt);
    const sentiment = result.response.text().trim().toLowerCase();
    
    if (['positive', 'negative', 'neutral'].includes(sentiment)) {
      return sentiment;
    }
    return 'neutral';
  } catch (error: any) {
    log('❌ Error analyzing sentiment', { error: error.message });
    return 'neutral';
  }
}

/**
 * Handle agent task
 */
async function handleAgentTask(message: any) {
  const { taskId, correlationId, requestId, agentType, action, payload } = message;
  const startTime = Date.now();
  
  log(`📥 Processing task`, { taskId, action, agentType });
  
  try {
    // Check if this is for us
    if (agentType !== 'news') {
      return; // Ignore tasks for other agents
    }
    
    // Fetch news
    const news = await fetchNews(payload.symbol, payload.category);
    
    if (news.length === 0) {
      throw new Error('No news available');
    }
    
    // Process news with sentiment
    const processedNews = [];
    for (const item of news.slice(0, 5)) {
      const sentiment = await analyzeSentiment(item.headline, item.summary || '');
      processedNews.push({
        headline: item.headline,
        summary: item.summary,
        source: item.source,
        url: item.url,
        datetime: item.datetime,
        sentiment,
      });
      
      // Publish to news.events
      await producer.send({
        topic: 'news.events',
        messages: [{
          key: uuidv4(),
          value: JSON.stringify({
            eventId: uuidv4(),
            timestamp: new Date(item.datetime * 1000).toISOString(),
            source: item.source,
            headline: item.headline,
            summary: item.summary,
            sentiment,
            symbols: item.related ? [item.related] : [],
            url: item.url,
          }),
        }],
      });
    }
    
    // Generate summary using Gemini
    const summaryPrompt = `Summarize these financial news headlines in 2-3 sentences:

${processedNews.map(n => `- ${n.headline} (${n.sentiment})`).join('\n')}

Provide a concise market sentiment overview.`;
    
    const summaryResult = await model.generateContent(summaryPrompt);
    const summary = summaryResult.response.text();
    
    // Send response
    await producer.send({
      topic: 'agent.responses',
      messages: [{
        key: requestId || taskId,
        value: JSON.stringify({
          responseId: uuidv4(),
          requestId: requestId || taskId,
          correlationId: correlationId || taskId,
          agentType: 'news',
          status: 'success',
          result: {
            text: summary,
            news: processedNews,
            action,
          },
          metadata: {
            processingTimeMs: Date.now() - startTime,
            newsCount: processedNews.length,
          },
          timestamp: new Date().toISOString(),
        }),
      }],
    });
    
    log(`✅ Task completed`, { taskId, newsCount: processedNews.length });
    
    // Send monitoring event
    await producer.send({
      topic: 'monitoring.events',
      messages: [{
        key: 'news-agent',
        value: JSON.stringify({
          eventId: `mon_${Date.now()}`,
          service: 'news-agent',
          eventType: 'metric',
          message: 'Task processed successfully',
          metadata: {
            taskId,
            action,
            processingTimeMs: Date.now() - startTime,
            newsCount: processedNews.length,
          },
          timestamp: new Date().toISOString(),
        }),
      }],
    });
    
  } catch (error: any) {
    log(`❌ Error processing task`, { taskId, error: error.message });
    
    // Send error response
    await producer.send({
      topic: 'agent.responses',
      messages: [{
        key: requestId || taskId,
        value: JSON.stringify({
          responseId: uuidv4(),
          requestId: requestId || taskId,
          correlationId: correlationId || taskId,
          agentType: 'news',
          status: 'error',
          result: {
            error: error.message,
          },
          metadata: {
            processingTimeMs: Date.now() - startTime,
          },
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  }
}

/**
 * Main
 */
async function main() {
  log('==========================================');
  log('📰 Starting News Agent v2.0');
  log('==========================================');
  
  if (!FINNHUB_API_KEY) {
    log('⚠️  WARNING: FINNHUB_API_KEY not set!');
  }
  
  // Connect to Kafka
  log('Connecting to Kafka...');
  await consumer.connect();
  await producer.connect();
  
  // Subscribe
  await consumer.subscribe({ topics: ['agent.tasks'], fromBeginning: false });
  
  log('✅ News Agent ready');
  log('Listening for news tasks...');
  log('==========================================');
  
  // Start consuming
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const payload = JSON.parse(message.value?.toString() || '{}');
        await handleAgentTask(payload);
      } catch (error: any) {
        log('❌ Error processing message', { error: error.message });
      }
    },
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  log('Shutting down...');
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('Shutting down...');
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
});

// Start
main().catch(error => {
  log('💥 Fatal error', { error: error.message });
  process.exit(1);
});

