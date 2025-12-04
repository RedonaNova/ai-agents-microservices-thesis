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
async function getMSEData(symbol?: string) {
  try {
    // First try to get real-time status data
    let query = `
      SELECT 
        s.symbol, 
        COALESCE(s.name, c.name) as name, 
        c.sector, 
        c.industry,
        COALESCE(s.current_price, th.closing_price) as closing_price,
        COALESCE(s.volume, th.volume) as volume,
        COALESCE(s.updated_at::date, th.trade_date) as trade_date,
        COALESCE(s.current_price - s.previous_close, th.closing_price - th.previous_close) as change,
        COALESCE(s.change_percent, ((th.closing_price - th.previous_close) / NULLIF(th.previous_close, 0) * 100)) as change_percent
      FROM mse_companies c
      LEFT JOIN mse_trading_status s ON c.symbol = s.symbol
      LEFT JOIN LATERAL (
        SELECT * FROM mse_trading_history 
        WHERE symbol = c.symbol 
        ORDER BY trade_date DESC 
        LIMIT 1
      ) th ON true
    `;
    
    const params: any[] = [];
    if (symbol) {
      query += ` WHERE c.symbol ILIKE $1 OR c.symbol = $2`;
      params.push(`%${symbol}%`, symbol.toUpperCase());
    }
    
    query += ` ORDER BY c.symbol LIMIT 50`;
    
    const result = await db.query(query, params);
    
    // If no data from companies table, try direct from trading history
    if (result.rows.length === 0) {
      const fallbackQuery = `
        SELECT DISTINCT ON (symbol)
          symbol, name, 
          NULL as sector, NULL as industry,
          closing_price, volume, trade_date,
          (closing_price - previous_close) as change,
          ((closing_price - previous_close) / NULLIF(previous_close, 0) * 100) as change_percent
        FROM mse_trading_history
        ${symbol ? 'WHERE symbol ILIKE $1' : ''}
        ORDER BY symbol, trade_date DESC
        LIMIT 50
      `;
      const fallbackResult = await db.query(fallbackQuery, symbol ? [`%${symbol}%`] : []);
      return fallbackResult.rows;
    }
    
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
  const { userId, query, symbols, userProfile } = payload;
  
  // Fetch relevant data
  const mseData = symbols && symbols.length > 0 
    ? await getMSEData(symbols[0]) 
    : await getMSEData();
  
  // Build personalization context from user profile
  let personalizationContext = '';
  if (userProfile) {
    personalizationContext = `
Хэрэглэгчийн хөрөнгө оруулалтын профайл:
- Хөрөнгө оруулалтын зорилго: ${userProfile.investmentGoal || 'Тодорхойгүй'}
- Эрсдлийн хүлээцтэй байдал: ${userProfile.riskTolerance || 'Дунд'}
- Сонирхож буй салбарууд: ${userProfile.preferredIndustries?.join(', ') || 'Тодорхойгүй'}

ЧУХАЛ: Дээрх профайл дээр суурилан хувийн зөвлөгөө өг. Эрсдлийн хүлээцтэй байдал "Low" бол аюулгүй хувьцаа санал болго, "High" бол өндөр өсөлттэй хувьцаа санал болго.
`;
  }
  
  // Build prompt - ALL RESPONSES IN MONGOLIAN
  let prompt = '';
  
  // Helper to format numbers safely
  const formatPercent = (val: any) => val != null && !isNaN(val) ? Number(val).toFixed(2) : '0.00';
  const formatPrice = (val: any) => val != null && !isNaN(val) ? Number(val).toFixed(2) : 'N/A';
  const formatVolume = (val: any) => val != null && !isNaN(val) ? Number(val).toLocaleString() : 'N/A';

  if (action === 'analyze_portfolio' || action === 'provide_advice') {
    prompt = `Та Монголын Хөрөнгийн Биржийн хөрөнгө оруулалтын зөвлөх юм. ЗААВАЛ МОНГОЛ ХЭЛЭЭР хариулна уу.

${personalizationContext}

Хэрэглэгчийн асуулт: ${query || 'Хөрөнгө оруулалтын зөвлөгөө өгнө үү'}

Монголын Хөрөнгийн Биржийн хувьцаанууд:
${mseData.slice(0, 10).map(s => `- ${s.symbol} (${s.name}): ${formatPrice(s.closing_price)} ₮, ${formatPercent(s.change_percent)}%`).join('\n')}

${context.ragResults ? `\nНэмэлт мэдээлэл:\n${context.ragResults.map((r: any) => r.content).join('\n\n')}` : ''}

2-3 догол мөр дотор товч, ашигтай хөрөнгө оруулалтын зөвлөгөө өгнө үү:
1. Зах зээлийн тойм
2. Тусгай санал (хэрэглэгчийн профайл дээр суурилсан)
3. Эрсдлийн анхааруулга

Мэргэжлийн, өгөгдөлд суурилсан хариулт өг.`;
  } else if (action === 'analyze_market') {
    prompt = `Монголын Хөрөнгийн Биржийн зах зээлийн нөхцөл байдлыг дүн шинжилгээ хий. ЗААВАЛ МОНГОЛ ХЭЛЭЭР хариулна уу.

${personalizationContext}

Шилдэг хувьцаанууд:
${mseData.slice(0, 15).map(s => `- ${s.symbol}: ${formatPrice(s.closing_price)} ₮ (${Number(s.change_percent) >= 0 ? '+' : ''}${formatPercent(s.change_percent)}%)`).join('\n')}

Дараахыг өгнө үү:
1. Зах зээлийн ерөнхий мэдрэмж (1-2 өгүүлбэр)
2. Сайн ажиллаж буй салбарууд (1-2 өгүүлбэр)
3. Анхаарах чиг хандлагууд (1-2 өгүүлбэр)`;
  } else if (action === 'analyze_watchlist') {
    // Special action for watchlist analysis
    const watchlistSymbols = payload.watchlistSymbols || [];
    const watchlistData = mseData.filter(s => watchlistSymbols.includes(s.symbol));
    
    prompt = `Та Монголын Хөрөнгийн Биржийн хөрөнгө оруулалтын шинжээч юм. ЗААВАЛ МОНГОЛ ХЭЛЭЭР хариулна уу.

${personalizationContext}

Хэрэглэгчийн ажиглаж буй хувьцаанууд:
${watchlistData.length > 0 
  ? watchlistData.map(s => `- ${s.symbol} (${s.name || 'N/A'}): ${formatPrice(s.closing_price)} ₮ | Хэмжээ: ${formatVolume(s.volume)} | Өөрчлөлт: ${Number(s.change_percent) >= 0 ? '+' : ''}${formatPercent(s.change_percent)}%`).join('\n')
  : 'Мэдээлэл олдсонгүй'
}

Хэрэглэгчийн ажиглаж буй хувьцаа тус бүрийн талаар дэлгэрэнгүй дүн шинжилгээ хийж, хувийн зөвлөгөө өг:
1. Хувьцаа бүрийн гүйцэтгэл (үнэ, хэмжээ, өөрчлөлт)
2. Хэрэглэгчийн профайл дээр суурилсан худалдан авах/зарах/хадгалах зөвлөмж
3. Эрсдлийн үнэлгээ (хэрэглэгчийн эрсдлийн хүлээцтэй байдалтай харьцуулан)
4. Ирээдүйн хандлагын таамаглал`;
  } else {
    // Generic analysis with MSE data
    prompt = `Та Монголын Хөрөнгийн Биржийн хөрөнгө оруулалтын шинжээч юм. ЗААВАЛ МОНГОЛ ХЭЛЭЭР хариулна уу.

${personalizationContext}

Хэрэглэгчийн асуулт: ${query || 'Зах зээлийн дүн шинжилгээ хийнэ үү'}

Одоогийн МХБ-ийн өгөгдөл:
${mseData.slice(0, 15).map(s => `- ${s.symbol} (${s.name || 'N/A'}): ${formatPrice(s.closing_price)} ₮ | Хэмжээ: ${formatVolume(s.volume)} | Өөрчлөлт: ${Number(s.change_percent) >= 0 ? '+' : ''}${formatPercent(s.change_percent)}%`).join('\n')}

Дэлгэрэнгүй, өгөгдөлд суурилсан дүн шинжилгээ хий:
1. Дээрх БОДИТ МХБ өгөгдлийг ашигла
2. Тодорхой хувьцааны тэмдэг, үнэ, хэмжээг дурдана
3. Хэрэглэгчийн асуултад бүрэн хариулна
4. Мэргэжлийн, үйл ажиллагааны чанартай байна

Чухал: Дээрх МХБ-ийн мэдээллийн сангийн бодит өгөгдлийг ашигла, ерөнхий хариултыг бүү ашигла.`;
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

