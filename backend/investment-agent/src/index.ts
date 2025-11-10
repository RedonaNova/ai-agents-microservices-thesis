import { Kafka, Consumer, Producer, CompressionTypes, CompressionCodecs } from 'kafkajs';
import SnappyCodec from 'kafkajs-snappy';
import { Pool } from 'pg';
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

// PostgreSQL
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'thesis_user',
  password: process.env.DB_PASSWORD || 'thesis_pass',
  database: process.env.DB_NAME || 'thesis_db',
  max: 10,
});

// Gemini AI
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Kafka
const kafka = new Kafka({
  clientId: 'investment-agent',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'investment-agent-group' });
const producer = kafka.producer();

/**
 * Get MSE stock data
 */
async function getMSEData(symbol?: string) {
  try {
    let query = `
      SELECT DISTINCT ON (c.symbol)
        c.symbol, c.name, c.sector, c.industry,
        th.closing_price, th.volume, th.trade_date,
        (th.closing_price - th.previous_close) as change,
        ((th.closing_price - th.previous_close) / NULLIF(th.previous_close, 0) * 100) as change_percent
      FROM mse_companies c
      LEFT JOIN mse_trading_history th ON c.symbol = th.symbol
    `;
    
    const params: any[] = [];
    if (symbol) {
      query += ` WHERE c.symbol = $1`;
      params.push(symbol.toUpperCase());
    }
    
    query += ` ORDER BY c.symbol, th.trade_date DESC LIMIT 50`;
    
    const result = await db.query(query, params);
    return result.rows;
  } catch (error: any) {
    log('❌ Error fetching MSE data', { error: error.message });
    return [];
  }
}

/**
 * Generate AI response using Gemini
 */
async function generateAIResponse(action: string, payload: any, context: any = {}) {
  const { userId, query, symbols } = payload;
  
  // Fetch relevant data
  const mseData = symbols && symbols.length > 0 
    ? await getMSEData(symbols[0]) 
    : await getMSEData();
  
  // Build prompt
  let prompt = '';
  
  if (action === 'analyze_portfolio' || action === 'provide_advice') {
    prompt = `You are an investment advisor for the Mongolian Stock Exchange.

User Query: ${query || 'Provide portfolio advice'}

Available MSE Stocks (sample):
${mseData.slice(0, 10).map(s => `- ${s.symbol} (${s.name}): ${s.closing_price} MNT, ${s.change_percent?.toFixed(2)}%`).join('\n')}

${context.ragResults ? `\nRelevant Information:\n${context.ragResults.map((r: any) => r.content).join('\n\n')}` : ''}

Provide concise, actionable investment advice in 2-3 paragraphs. Focus on:
1. Market overview
2. Specific recommendations
3. Risk considerations

Keep it professional and data-driven.`;
  } else if (action === 'analyze_market') {
    prompt = `Analyze the current Mongolian Stock Exchange market conditions.

Top Stocks:
${mseData.slice(0, 15).map(s => `- ${s.symbol}: ${s.closing_price} MNT (${s.change_percent >= 0 ? '+' : ''}${s.change_percent?.toFixed(2)}%)`).join('\n')}

Provide:
1. Overall market sentiment (1-2 sentences)
2. Top sectors performing well (1-2 sentences)
3. Key trends to watch (1-2 sentences)`;
  } else {
    prompt = `${query}\n\nProvide a helpful response based on MSE stock market data.`;
  }
  
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error: any) {
    log('❌ Gemini API error', { error: error.message });
    return 'I apologize, but I am unable to provide investment advice at this moment. Please try again later.';
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
    if (agentType !== 'investment') {
      return; // Ignore tasks for other agents
    }
    
    // Generate response
    const result = await generateAIResponse(action, payload);
    
    // Send response
    await producer.send({
      topic: 'agent.responses',
      messages: [{
        key: requestId || taskId,
        value: JSON.stringify({
          responseId: uuidv4(),
          requestId: requestId || taskId,
          correlationId: correlationId || taskId,
          agentType: 'investment',
          status: 'success',
          result: {
            text: result,
            action,
          },
          metadata: {
            processingTimeMs: Date.now() - startTime,
            model: 'gemini-2.0-flash',
          },
          timestamp: new Date().toISOString(),
        }),
      }],
    });
    
    log(`✅ Task completed`, { taskId, duration: Date.now() - startTime });
    
    // Send monitoring event
    await producer.send({
      topic: 'monitoring.events',
      messages: [{
        key: 'investment-agent',
        value: JSON.stringify({
          eventId: `mon_${Date.now()}`,
          service: 'investment-agent',
          eventType: 'metric',
          message: 'Task processed successfully',
          metadata: {
            taskId,
            action,
            processingTimeMs: Date.now() - startTime,
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
          agentType: 'investment',
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
  log('🚀 Starting Investment Agent v2.0');
  log('==========================================');
  
  // Connect to PostgreSQL
  log('Connecting to PostgreSQL...');
  await db.connect();
  
  // Connect to Kafka
  log('Connecting to Kafka...');
  await consumer.connect();
  await producer.connect();
  
  // Subscribe
  await consumer.subscribe({ topics: ['agent.tasks', 'execution.plans'], fromBeginning: false });
  
  log('✅ Investment Agent ready');
  log('Listening for investment tasks...');
  log('==========================================');
  
  // Start consuming
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const payload = JSON.parse(message.value?.toString() || '{}');
        
        if (topic === 'agent.tasks') {
          await handleAgentTask(payload);
        } else if (topic === 'execution.plans') {
          // Handle execution plans from Flink
          log('📋 Received execution plan', { planId: payload.planId });
          // In a complete implementation, this would process multi-step plans
        }
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
  await db.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('Shutting down...');
  await consumer.disconnect();
  await producer.disconnect();
  await db.end();
  process.exit(0);
});

// Start
main().catch(error => {
  log('💥 Fatal error', { error: error.message });
  process.exit(1);
});

