import { Kafka, Consumer, Producer } from 'kafkajs';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Simple logger
const log = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
};

// PostgreSQL connection
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'thesis_user',
  password: process.env.DB_PASSWORD || 'thesis_pass',
  database: process.env.DB_NAME || 'thesis_db',
  max: 10,
});

// Kafka setup
const kafka = new Kafka({
  clientId: 'knowledge-agent',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'knowledge-agent-group' });
const producer = kafka.producer();

// In-memory knowledge base (simplified FAISS alternative)
let knowledgeBase: Array<{
  id: number;
  content: string;
  contentType: string;
  metadata: any;
}> = [];

/**
 * Load knowledge base from PostgreSQL
 */
async function loadKnowledgeBase() {
  try {
    const result = await db.query('SELECT * FROM knowledge_base ORDER BY id');
    knowledgeBase = result.rows;
    log(`✅ Loaded ${knowledgeBase.length} knowledge base entries`);
  } catch (error: any) {
    log('❌ Failed to load knowledge base', { error: error.message });
  }
}

/**
 * Simple semantic search (keyword matching for demo)
 * In production, this would use FAISS embeddings
 */
function search(query: string, topK: number = 5, filters?: any): any[] {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(' ');

  // Score each document
  const scored = knowledgeBase.map(doc => {
    let score = 0;
    const contentLower = doc.content.toLowerCase();

    // Keyword matching
    keywords.forEach(keyword => {
      if (contentLower.includes(keyword)) {
        score += 1;
      }
    });

    // Filter matching
    if (filters) {
      if (filters.content_type && doc.contentType === filters.content_type) {
        score += 2;
      }
      if (filters.symbol && doc.metadata?.symbol === filters.symbol) {
        score += 3;
      }
    }

    return { ...doc, score };
  });

  // Sort by score and return top K
  const results = scored
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results.map(({ score, ...doc }) => ({
    ...doc,
    score: score / keywords.length, // Normalize
  }));
}

/**
 * Handle knowledge query
 */
async function handleKnowledgeQuery(message: any) {
  const { queryId, correlationId, query, topK = 5, filters } = message;
  const startTime = Date.now();

  log('📚 Processing knowledge query', { queryId, query });

  try {
    // Perform search
    const results = search(query, topK, filters);

    // Send results
    await producer.send({
      topic: 'knowledge.results',
      messages: [{
        key: queryId,
        value: JSON.stringify({
          queryId,
          correlationId,
          results,
          metadata: {
            totalResults: results.length,
            processingTimeMs: Date.now() - startTime,
          },
          timestamp: new Date().toISOString(),
        }),
      }],
    });

    log(`✅ Returned ${results.length} results`, { queryId });

    // Send monitoring event
    await producer.send({
      topic: 'monitoring.events',
      messages: [{
        key: 'knowledge-agent',
        value: JSON.stringify({
          eventId: `mon_${Date.now()}`,
          service: 'knowledge-agent',
          eventType: 'metric',
          message: 'Query processed',
          metadata: {
            queryId,
            resultCount: results.length,
            processingTimeMs: Date.now() - startTime,
          },
          timestamp: new Date().toISOString(),
        }),
      }],
    });

  } catch (error: any) {
    log('❌ Error processing query', { queryId, error: error.message });
    
    // Send error response
    await producer.send({
      topic: 'knowledge.results',
      messages: [{
        key: queryId,
        value: JSON.stringify({
          queryId,
          correlationId,
          results: [],
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
      }],
    });
  }
}

/**
 * Main function
 */
async function main() {
  log('==========================================');
  log('🚀 Starting Knowledge Agent (RAG)');
  log('==========================================');

  // Connect to PostgreSQL
  log('Connecting to PostgreSQL...');
  await db.connect();

  // Load knowledge base
  await loadKnowledgeBase();

  // Connect to Kafka
  log('Connecting to Kafka...');
  await consumer.connect();
  await producer.connect();

  // Subscribe to topics
  await consumer.subscribe({ topics: ['knowledge.queries'], fromBeginning: false });

  log('✅ Knowledge Agent ready');
  log('Listening for knowledge queries...');
  log('==========================================');

  // Start consuming
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const payload = JSON.parse(message.value?.toString() || '{}');
        await handleKnowledgeQuery(payload);
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

