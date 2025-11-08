import { Router, Request, Response } from 'express';
import kafkaService from '../services/kafka';
import mongodb from '../services/mongodb';
import logger from '../services/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/auth/register
 * Triggers welcome email flow via Kafka
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, name, country, investmentGoals, riskTolerance, preferredIndustry } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Send user registration event to Kafka
    const requestId = uuidv4();
    await kafkaService.sendEvent('user-registration-events', email, {
      requestId,
      email,
      name,
      country,
      investmentGoals,
      riskTolerance,
      preferredIndustry,
      timestamp: new Date().toISOString()
    });

    logger.info('User registration event sent', { email, requestId });

    res.status(202).json({
      success: true,
      message: 'Registration processed. Welcome email will be sent shortly.',
      requestId
    });
  } catch (error) {
    logger.error('Registration error', { error });
    res.status(500).json({ error: 'Failed to process registration' });
  }
});

export default router;

