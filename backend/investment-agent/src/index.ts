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
const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Kafka
const kafka = new Kafka({
  clientId: 'investment-agent',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'investment-agent-group' });
const producer = kafka.producer();

/**
 * Get MSE stock data - prioritize mse_trading_status for current prices,
 * fallback to mse_trading_history for historical data
 */
async function getMSEData(symbols?: string | string[]) {
  try {
    // Normalize symbols to array with -O-0000 suffix
    let symbolList: string[] = [];
    if (symbols) {
      const rawSymbols = Array.isArray(symbols) ? symbols : [symbols];
      symbolList = rawSymbols.map(s => {
        const upper = s.toUpperCase();
        return upper.endsWith('-O-0000') ? upper : upper + '-O-0000';
      });
    }
    
    // Query trading_status first (current prices), then trading_history as fallback
    let query: string;
    let params: any[] = [];
    
    if (symbolList.length > 0) {
      // Fetch specific symbols from trading_status
      query = `
        SELECT 
          ts.symbol, 
          COALESCE(ts.name, c.name, '') as name,
          COALESCE(c.sector, '') as sector,
          COALESCE(ts.current_price, 0) as closing_price,
          COALESCE(ts.volume, 0) as volume,
          COALESCE(ts.change_percent, 0) as change_percent,
          ts.last_trade_time as trade_date
        FROM mse_trading_status ts
        LEFT JOIN mse_companies c ON ts.symbol = c.symbol
        WHERE ts.symbol = ANY($1)
        
        UNION ALL
        
        SELECT DISTINCT ON (th.symbol)
          th.symbol,
          COALESCE(th.name, c.name, '') as name,
          COALESCE(c.sector, '') as sector,
          COALESCE(th.closing_price, 0) as closing_price,
          COALESCE(th.volume, 0) as volume,
          COALESCE(((th.closing_price - th.previous_close) / NULLIF(th.previous_close, 0) * 100), 0) as change_percent,
          th.trade_date
        FROM mse_trading_history th
        LEFT JOIN mse_companies c ON th.symbol = c.symbol
        WHERE th.symbol = ANY($1)
          AND th.symbol NOT IN (SELECT symbol FROM mse_trading_status WHERE symbol = ANY($1))
        ORDER BY th.symbol, th.trade_date DESC
      `;
      params = [symbolList];
    } else {
      // Fetch all stocks for general analysis
      query = `
        SELECT 
          ts.symbol, 
          COALESCE(ts.name, '') as name,
          '' as sector,
          COALESCE(ts.current_price, 0) as closing_price,
          COALESCE(ts.volume, 0) as volume,
          COALESCE(ts.change_percent, 0) as change_percent,
          ts.last_trade_time as trade_date
        FROM mse_trading_status ts
        ORDER BY ts.volume DESC NULLS LAST
        LIMIT 50
      `;
    }
    
    const result = await db.query(query, params);
    log('📊 Fetched MSE data', { count: result.rows.length, symbols: symbolList });
    return result.rows;
  } catch (error: any) {
    log('❌ Error fetching MSE data', { error: error.message });
    return [];
  }
}

/**
 * Generate AI response using Gemini with personalization
 */
async function generateAIResponse(action: string, payload: any, context: any = {}) {
  const { userId, query, userProfile } = payload;
  
  // Get symbols from context (passed by orchestrator) or direct payload
  const symbols = payload.context?.symbols || payload.symbols || [];
  
  log('🔍 Processing request', { action, symbols, hasContext: !!payload.context });
  
  // Fetch relevant data - pass all symbols for watchlist analysis
  const mseData = symbols && symbols.length > 0 
    ? await getMSEData(symbols) 
    : await getMSEData();
  
  // Build personalization context from user profile
  let personalizationContext = '';
  if (userProfile) {
    personalizationContext = `
Хэрэглэгчийн хөрөнгө оруулалтын профайл:
- Хөрөнгө оруулалтын зорилго: ${userProfile.investmentGoal || 'Тодорхойгүй'}
- Эрсдэлийн хүлээцтэй байдал: ${userProfile.riskTolerance || 'Дунд'}
- Сонирхож буй салбарууд: ${userProfile.preferredIndustries?.join(', ') || 'Тодорхойгүй'}

ЧУХАЛ: Дээрх профайл дээр суурилан хувийн зөвлөгөө өг. Эрсдэлийн хүлээцтэй байдал "Low" бол аюулгүй хувьцаа санал болго, "High" бол өндөр өсөлттэй хувьцаа санал болго.
`;
  }
  
  // Build prompt - ALL RESPONSES IN MONGOLIAN
  let prompt = '';
  
  // Helper to format numbers safely
  const formatPercent = (val: any) => val != null && !isNaN(val) ? Number(val).toFixed(2) : '0.00';
  const formatPrice = (val: any) => val != null && !isNaN(val) ? Number(val).toFixed(2) : 'N/A';
  const formatVolume = (val: any) => val != null && !isNaN(val) ? Number(val).toLocaleString() : 'N/A';

  if (action === 'analyze_portfolio' || action === 'provide_advice') {
    prompt = `Та МХБ-ийн хөрөнгө оруулалтын зөвлөх. МОНГОЛ ХЭЛЭЭР, ТОВЧ (150 үг хүртэл) хариулна уу.

${personalizationContext}

Асуулт: ${query || 'Хөрөнгө оруулалтын зөвлөгөө'}

МХБ хувьцаа (топ 5):
${mseData.slice(0, 5).map(s => `${s.symbol}: ${formatPrice(s.closing_price)}₮ (${formatPercent(s.change_percent)}%)`).join(' | ')}

ТОВЧ ХАРИУЛТ (3 хэсэгт):
• Зах зээл: (1 өгүүлбэр)
• Зөвлөмж: (тодорхой хувьцаа дурдах)
• Эрсдэл: (1 өгүүлбэр)`;
  } else if (action === 'analyze_market') {
    prompt = `МХБ зах зээлийн шинжилгээ. МОНГОЛ, ТОВЧ (100 үг).

${personalizationContext}

Топ хувьцаа:
${mseData.slice(0, 8).map(s => `${s.symbol}: ${formatPrice(s.closing_price)}₮ (${formatPercent(s.change_percent)}%)`).join(' | ')}

ТОВЧ (3 өгүүлбэр):
• Зах зээлийн мэдрэмж
• Идэвхтэй салбар
• Анхаарах зүйл`;
  } else if (action === 'analyze_watchlist') {
    // Special action for watchlist analysis - mseData already filtered by symbols
    prompt = `МХБ ажиглах жагсаалтын шинжилгээ. МОНГОЛ, ТОВЧ (200 үг хүртэл).

${personalizationContext}

Ажиглаж буй хувьцаанууд:
${mseData.length > 0 
  ? mseData.map(s => `• ${s.symbol}: ${formatPrice(s.closing_price)}₮ | Хэмжээ: ${formatVolume(s.volume)} | Өөрчлөлт: ${formatPercent(s.change_percent)}%`).join('\n')
  : 'Хувьцааны мэдээлэл олдсонгүй'
}

ТОВЧ ШИНЖИЛГЭЭ (хувьцаа тус бүрд):
• [Хувьцаа]: Үнэ, хэмжээ + Зөвлөмж (Авах/Зарах/Хадгалах)

Ерөнхий дүгнэлт: (1-2 өгүүлбэр)`;
  } else {
    // Generic analysis with MSE data
    prompt = `МХБ шинжээч. МОНГОЛ, ТОВЧ (150 үг хүртэл).

${personalizationContext}

Асуулт: ${query || 'Зах зээлийн шинжилгээ'}

МХБ өгөгдөл:
${mseData.slice(0, 8).map(s => `${s.symbol}: ${formatPrice(s.closing_price)}₮ (${formatPercent(s.change_percent)}%)`).join(' | ')}

ШУУД ХАРИУЛТ:
• Асуултад хариулах (тодорхой хувьцаа дурдах)
• Зөвлөмж өгөх
• Эрсдэл дурдах (1 өгүүлбэр)`;
  }
  
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error: any) {
    log('❌ Gemini API error', { error: error.message });
    return 'Уучлаарай, одоогоор хөрөнгө оруулалтын зөвлөгөө өгөх боломжгүй байна. Дараа дахин оролдоно уу.';
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
            model: 'gemini-2.5-flash',
          },
          timestamp: new Date().toISOString(),
        }),
      }],
    });
    
    // Save response to database for easy retrieval
    try {
      await db.query(
        `INSERT INTO agent_responses_cache 
         (request_id, user_id, agent_type, query, response, processing_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (request_id) DO UPDATE 
         SET response = EXCLUDED.response, processing_time_ms = EXCLUDED.processing_time_ms`,
        [
          requestId || taskId,
          payload?.userId || 'guest',
          'investment',
          payload?.query || action || 'Investment query',
          result,
          Date.now() - startTime
        ]
      );
      log(`✅ Response saved to database`, { requestId: requestId || taskId });
    } catch (dbError: any) {
      log(`⚠️ Failed to save response to database`, { error: dbError.message });
    }
    
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

