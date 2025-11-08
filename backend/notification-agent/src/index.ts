/**
 * Consolidated Notification Agent
 * Combines: Welcome Emails + Daily News Summaries
 */

import dotenv from 'dotenv';
dotenv.config({ path: '/home/it/apps/thesis-report/backend/.env' });

import cron from 'node-cron';
import { EachMessagePayload } from 'kafkajs';
import kafkaClient from './kafka-client';
import { sendWelcomeEmail, sendDailyNewsSummary, runDailyNewsJob } from './notification-service';
import { UserRegistrationEvent, NotificationResponse } from './types';
import logger from './logger';

/**
 * Process incoming notification request
 */
async function processNotificationRequest(payload: EachMessagePayload): Promise<void> {
  const { topic, message } = payload;

  try {
    const data = JSON.parse(message.value?.toString() || '{}');

    // Handle welcome email
    if (topic === 'user-registration-events') {
      logger.info('Processing welcome email', {
        requestId: data.requestId,
        email: data.email
      });

      const event: UserRegistrationEvent = {
        requestId: data.requestId,
        email: data.email,
        name: data.name,
        country: data.country,
        investmentGoals: data.investmentGoals,
        riskTolerance: data.riskTolerance,
        preferredIndustry: data.preferredIndustry,
        timestamp: data.timestamp || new Date().toISOString()
      };

      const result = await sendWelcomeEmail(event);

      const response: NotificationResponse = {
        requestId: event.requestId,
        type: 'welcome_email',
        success: result.success,
        message: result.success ? 'Welcome email sent successfully' : result.error || 'Failed to send',
        emailsSent: result.success ? 1 : 0,
        errors: result.success ? [] : [result.error || 'Unknown error'],
        timestamp: new Date().toISOString()
      };

      await kafkaClient.sendResponse(event.email, response);

      logger.info('Welcome email processed', {
        requestId: event.requestId,
        success: result.success
      });
    }

    // Handle daily news trigger
    else if (topic === 'daily-news-trigger') {
      logger.info('Processing daily news job', {
        jobId: data.jobId,
        type: data.type
      });

      const result = await runDailyNewsJob();

      const response: NotificationResponse = {
        requestId: data.jobId,
        type: 'daily_news',
        success: result.success,
        message: `Daily news job completed. Sent ${result.emailsSent} emails.`,
        emailsSent: result.emailsSent,
        errors: result.errors,
        timestamp: new Date().toISOString()
      };

      await kafkaClient.sendResponse('daily-news-job', response);

      logger.info('Daily news job completed', {
        jobId: data.jobId,
        emailsSent: result.emailsSent,
        errorsCount: result.errors.length
      });
    }
  } catch (error) {
    logger.error('Failed to process notification request', {
      error,
      topic,
      message: message.value?.toString()
    });
  }
}

/**
 * Main startup function
 */
async function start() {
  try {
    logger.info('==========================================');
    logger.info('Starting Consolidated Notification Agent');
    logger.info('==========================================');

    // Connect to Kafka
    await kafkaClient.connect();

    // Start consuming messages
    await kafkaClient.startConsuming(processNotificationRequest);

    // Set up cron job for daily news (12:00 PM daily)
    cron.schedule('0 12 * * *', async () => {
      logger.info('Cron triggered: Daily news job');
      try {
        const result = await runDailyNewsJob();
        logger.info('Cron job completed', {
          emailsSent: result.emailsSent,
          errorsCount: result.errors.length
        });
      } catch (error) {
        logger.error('Cron job failed', { error });
      }
    });

    logger.info('==========================================');
    logger.info('✅ Notification Agent is running!');
    logger.info('==========================================');
    logger.info('Capabilities:');
    logger.info('  - Welcome emails with AI personalization');
    logger.info('  - Daily news summaries with AI insights');
    logger.info('  - SMTP email delivery');
    logger.info('  - Gemini AI integration');
    logger.info('');
    logger.info('Subscribed Topics:');
    logger.info('  - user-registration-events (welcome emails)');
    logger.info('  - daily-news-trigger (manual trigger)');
    logger.info('');
    logger.info('Schedule:');
    logger.info('  - Daily news: 12:00 PM (cron: 0 12 * * *)');
    logger.info('==========================================');
  } catch (error) {
    logger.error('Failed to start Notification Agent', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down Notification Agent...');
  await kafkaClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down Notification Agent...');
  await kafkaClient.disconnect();
  process.exit(0);
});

// Start the agent
start();

