"use strict";
/**
 * Consolidated Notification Agent
 * Combines: Welcome Emails + Daily News Summaries
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '/home/it/apps/thesis-report/backend/.env' });
const node_cron_1 = __importDefault(require("node-cron"));
const kafka_client_1 = __importDefault(require("./kafka-client"));
const notification_service_1 = require("./notification-service");
const logger_1 = __importDefault(require("./logger"));
/**
 * Process incoming notification request
 */
async function processNotificationRequest(payload) {
    const { topic, message } = payload;
    try {
        const data = JSON.parse(message.value?.toString() || '{}');
        // Handle welcome email
        if (topic === 'user-registration-events') {
            logger_1.default.info('Processing welcome email', {
                requestId: data.requestId,
                email: data.email
            });
            const event = {
                requestId: data.requestId,
                email: data.email,
                name: data.name,
                country: data.country,
                investmentGoals: data.investmentGoals,
                riskTolerance: data.riskTolerance,
                preferredIndustry: data.preferredIndustry,
                timestamp: data.timestamp || new Date().toISOString()
            };
            const result = await (0, notification_service_1.sendWelcomeEmail)(event);
            const response = {
                requestId: event.requestId,
                type: 'welcome_email',
                success: result.success,
                message: result.success ? 'Welcome email sent successfully' : result.error || 'Failed to send',
                emailsSent: result.success ? 1 : 0,
                errors: result.success ? [] : [result.error || 'Unknown error'],
                timestamp: new Date().toISOString()
            };
            await kafka_client_1.default.sendResponse(event.email, response);
            logger_1.default.info('Welcome email processed', {
                requestId: event.requestId,
                success: result.success
            });
        }
        // Handle daily news trigger
        else if (topic === 'daily-news-trigger') {
            logger_1.default.info('Processing daily news job', {
                jobId: data.jobId,
                type: data.type
            });
            const result = await (0, notification_service_1.runDailyNewsJob)();
            const response = {
                requestId: data.jobId,
                type: 'daily_news',
                success: result.success,
                message: `Daily news job completed. Sent ${result.emailsSent} emails.`,
                emailsSent: result.emailsSent,
                errors: result.errors,
                timestamp: new Date().toISOString()
            };
            await kafka_client_1.default.sendResponse('daily-news-job', response);
            logger_1.default.info('Daily news job completed', {
                jobId: data.jobId,
                emailsSent: result.emailsSent,
                errorsCount: result.errors.length
            });
        }
    }
    catch (error) {
        logger_1.default.error('Failed to process notification request', {
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
        logger_1.default.info('==========================================');
        logger_1.default.info('Starting Consolidated Notification Agent');
        logger_1.default.info('==========================================');
        // Connect to Kafka
        await kafka_client_1.default.connect();
        // Start consuming messages
        await kafka_client_1.default.startConsuming(processNotificationRequest);
        // Set up cron job for daily news (12:00 PM daily)
        node_cron_1.default.schedule('0 12 * * *', async () => {
            logger_1.default.info('Cron triggered: Daily news job');
            try {
                const result = await (0, notification_service_1.runDailyNewsJob)();
                logger_1.default.info('Cron job completed', {
                    emailsSent: result.emailsSent,
                    errorsCount: result.errors.length
                });
            }
            catch (error) {
                logger_1.default.error('Cron job failed', { error });
            }
        });
        logger_1.default.info('==========================================');
        logger_1.default.info('✅ Notification Agent is running!');
        logger_1.default.info('==========================================');
        logger_1.default.info('Capabilities:');
        logger_1.default.info('  - Welcome emails with AI personalization');
        logger_1.default.info('  - Daily news summaries with AI insights');
        logger_1.default.info('  - SMTP email delivery');
        logger_1.default.info('  - Gemini AI integration');
        logger_1.default.info('');
        logger_1.default.info('Subscribed Topics:');
        logger_1.default.info('  - user-registration-events (welcome emails)');
        logger_1.default.info('  - daily-news-trigger (manual trigger)');
        logger_1.default.info('');
        logger_1.default.info('Schedule:');
        logger_1.default.info('  - Daily news: 12:00 PM (cron: 0 12 * * *)');
        logger_1.default.info('==========================================');
    }
    catch (error) {
        logger_1.default.error('Failed to start Notification Agent', { error });
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    logger_1.default.info('Shutting down Notification Agent...');
    await kafka_client_1.default.disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger_1.default.info('Shutting down Notification Agent...');
    await kafka_client_1.default.disconnect();
    process.exit(0);
});
// Start the agent
start();
