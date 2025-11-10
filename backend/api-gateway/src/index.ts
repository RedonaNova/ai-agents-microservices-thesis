import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import logger from './services/logger';
import kafkaService from './services/kafka';
import db from './services/database';

// Routes
import usersRoutes from './routes/users.routes';
import newsRoutes from './routes/news.routes';
import agentRoutes from './routes/agent.routes';
import ragRoutes from './routes/rag.routes';
import monitoringRoutes from './routes/monitoring.routes';
import watchlistRoutes from './routes/watchlist.routes';
import dailyNewsRoutes from './routes/daily-news.routes';

const app: Express = express();

// Middleware
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'api-gateway'
  });
});

// API Routes
app.use('/api/users', usersRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/daily-news', dailyNewsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Startup function
async function start() {
  try {
    logger.info('Starting API Gateway...', {
      env: config.nodeEnv,
      port: config.port
    });

    // Connect to PostgreSQL
    await db.connect();
    
    // Connect to Kafka
    await kafkaService.getProducer();

    // Start Express server
    app.listen(config.port, () => {
      logger.info(`API Gateway listening on port ${config.port}`);
      logger.info(`CORS enabled for: ${config.corsOrigin}`);
      logger.info(`Kafka broker: ${config.kafkaBroker}`);
      logger.info('API Gateway is ready!');
    });
  } catch (error) {
    logger.error('Failed to start API Gateway', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await kafkaService.disconnect();
  await db.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await kafkaService.disconnect();
  await db.disconnect();
  process.exit(0);
});

// Start the server
start();

