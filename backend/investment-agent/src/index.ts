/**
 * Consolidated Investment Agent
 * Combines: Portfolio Advice, Market Analysis, Historical Analysis, Risk Assessment
 */

import dotenv from 'dotenv';
dotenv.config({ path: '/home/it/apps/thesis-report/backend/.env' });

import { EachMessagePayload } from 'kafkajs';
import kafkaClient from './kafka-client';
import database from './database';
import { handleInvestmentRequest } from './investment-service';
import { generateInvestmentInsight } from './gemini-client';
import { InvestmentRequest, InvestmentRequestType, InvestmentResponse } from './types';
import logger from './logger';

// Map topic names to request types
const TOPIC_TO_TYPE_MAP: Record<string, InvestmentRequestType> = {
  'portfolio-requests': 'portfolio_advice',
  'market-analysis-requests': 'market_analysis',
  'historical-analysis-requests': 'historical_analysis',
  'risk-assessment-requests': 'risk_assessment'
};

/**
 * Process incoming investment request
 */
async function processInvestmentRequest(payload: EachMessagePayload): Promise<void> {
  const { topic, message } = payload;

  try {
    const requestData = JSON.parse(message.value?.toString() || '{}');
    const requestType = TOPIC_TO_TYPE_MAP[topic];

    if (!requestType) {
      logger.warn('Unknown topic', { topic });
      return;
    }

    logger.info('Processing investment request', {
      requestId: requestData.requestId,
      type: requestType,
      userId: requestData.userId,
      topic
    });

    // Build investment request
    const investmentRequest: InvestmentRequest = {
      requestId: requestData.requestId,
      userId: requestData.userId,
      type: requestType,
      message: requestData.message,
      originalMessage: requestData.originalMessage,
      metadata: requestData.metadata,
      parameters: requestData.parameters || {},
      context: requestData.context || {},
      timestamp: requestData.timestamp || new Date().toISOString()
    };

    // Get data from database
    const data = await handleInvestmentRequest(investmentRequest);

    // Generate AI insights
    const aiInsight = await generateInvestmentInsight(requestType, data);

    // Prepare response
    const response: InvestmentResponse = {
      requestId: investmentRequest.requestId,
      userId: investmentRequest.userId,
      type: requestType,
      success: true,
      message: aiInsight,
      data: {
        ...data,
        aiInsight
      },
      sources: ['MSE Trading History', 'MSE Companies', 'Gemini AI'],
      processingTime: data.processingTime,
      timestamp: new Date().toISOString()
    };

    // Send response back to Kafka
    await kafkaClient.sendResponse(investmentRequest.userId, response);

    logger.info('Investment request completed', {
      requestId: investmentRequest.requestId,
      type: requestType,
      processingTime: `${data.processingTime}ms`
    });
  } catch (error) {
    logger.error('Failed to process investment request', {
      error,
      topic,
      message: message.value?.toString()
    });

    // Send error response
    try {
      const requestData = JSON.parse(message.value?.toString() || '{}');
      await kafkaClient.sendResponse(requestData.userId || 'unknown', {
        requestId: requestData.requestId,
        userId: requestData.userId,
        type: TOPIC_TO_TYPE_MAP[topic],
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process request',
        processingTime: 0,
        timestamp: new Date().toISOString()
      });
    } catch (sendError) {
      logger.error('Failed to send error response', { sendError });
    }
  }
}

/**
 * Main startup function
 */
async function start() {
  try {
    logger.info('==========================================');
    logger.info('Starting Consolidated Investment Agent');
    logger.info('==========================================');

    // Connect to database
    await database.connect();

    // Connect to Kafka
    await kafkaClient.connect();

    // Start consuming messages
    await kafkaClient.startConsuming(processInvestmentRequest);

    logger.info('==========================================');
    logger.info('✅ Investment Agent is running!');
    logger.info('==========================================');
    logger.info('Capabilities:');
    logger.info('  - Portfolio investment advice');
    logger.info('  - Market trend analysis');
    logger.info('  - Historical technical analysis');
    logger.info('  - Risk assessment & VaR calculation');
    logger.info('  - AI-powered insights (Gemini 2.0 Flash)');
    logger.info('');
    logger.info('Subscribed Topics:');
    logger.info('  - portfolio-requests');
    logger.info('  - market-analysis-requests');
    logger.info('  - historical-analysis-requests');
    logger.info('  - risk-assessment-requests');
    logger.info('==========================================');
  } catch (error) {
    logger.error('Failed to start Investment Agent', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down Investment Agent...');
  await kafkaClient.disconnect();
  await database.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down Investment Agent...');
  await kafkaClient.disconnect();
  await database.disconnect();
  process.exit(0);
});

// Start the agent
start();

