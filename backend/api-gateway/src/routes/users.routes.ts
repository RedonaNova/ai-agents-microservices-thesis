import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../services/database';
import kafkaService from '../services/kafka';
import emailService from '../services/email';
import logger from '../services/logger';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'thesis-demo-secret-change-in-production';

/**
 * POST /api/users/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      name,
      investmentGoal,
      riskTolerance,
      preferredIndustries,
    } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user into PostgreSQL
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, investment_goal, risk_tolerance, preferred_industries)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, investment_goal, risk_tolerance, preferred_industries, created_at`,
      [
        email,
        passwordHash,
        name || email.split('@')[0],
        investmentGoal || null,
        riskTolerance || null,
        preferredIndustries || [],
      ]
    );

    const user = result.rows[0];

    // Publish user.registered event to Kafka
    await kafkaService.sendEvent('user.events', user.id.toString(), {
      eventId: `event_${Date.now()}_${user.id}`,
      eventType: 'user.registered',
      userId: user.id.toString(),
      data: {
        email: user.email,
        name: user.name,
        investmentGoal: user.investment_goal,
        riskTolerance: user.risk_tolerance,
        preferredIndustries: user.preferred_industries,
      },
      timestamp: new Date().toISOString(),
    });

    // Send welcome email (async, don't wait)
    emailService.sendWelcomeEmail(user.email, user.name, {
      investmentGoal: user.investment_goal,
      riskTolerance: user.risk_tolerance,
      preferredIndustries: user.preferred_industries,
    }).catch(err => {
      logger.error('Failed to send welcome email:', err);
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log to monitoring
    await kafkaService.sendEvent('monitoring.events', 'api-gateway', {
      eventId: `mon_${Date.now()}`,
      service: 'api-gateway',
      eventType: 'info',
      message: 'User registered successfully',
      metadata: {
        userId: user.id,
        email: user.email,
      },
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        investmentGoal: user.investment_goal,
        riskTolerance: user.risk_tolerance,
        preferredIndustries: user.preferred_industries,
      },
      token,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

/**
 * POST /api/users/login
 * User login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Find user
    const result = await db.query(
      'SELECT id, email, password_hash, name, investment_goal, risk_tolerance, preferred_industries FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Update last_login
    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Publish login event
    await kafkaService.sendEvent('user.events', user.id.toString(), {
      eventId: `event_${Date.now()}_${user.id}`,
      eventType: 'user.login',
      userId: user.id.toString(),
      data: {
        email: user.email,
      },
      timestamp: new Date().toISOString(),
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        investmentGoal: user.investment_goal,
        riskTolerance: user.risk_tolerance,
        preferredIndustries: user.preferred_industries,
      },
      token,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * GET /api/users/profile
 * Get user profile
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    const result = await db.query(
      `SELECT id, email, name, investment_goal, risk_tolerance, preferred_industries, 
              created_at, last_login 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        investmentGoal: user.investment_goal,
        riskTolerance: user.risk_tolerance,
        preferredIndustries: user.preferred_industries,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
    });
  }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    const {
      name,
      investmentGoal,
      riskTolerance,
      preferredIndustries,
    } = req.body;

    const result = await db.query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           investment_goal = COALESCE($2, investment_goal),
           risk_tolerance = COALESCE($3, risk_tolerance),
           preferred_industries = COALESCE($4, preferred_industries),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, name, investment_goal, risk_tolerance, preferred_industries`,
      [name, investmentGoal, riskTolerance, preferredIndustries, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = result.rows[0];

    // Publish profile update event
    await kafkaService.sendEvent('user.events', user.id.toString(), {
      eventId: `event_${Date.now()}_${user.id}`,
      eventType: 'user.profile.updated',
      userId: user.id.toString(),
      data: {
        name: user.name,
        investmentGoal: user.investment_goal,
        riskTolerance: user.risk_tolerance,
        preferredIndustries: user.preferred_industries,
      },
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        investmentGoal: user.investment_goal,
        riskTolerance: user.risk_tolerance,
        preferredIndustries: user.preferred_industries,
      },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
});

/**
 * POST /api/users/watchlist
 * Add symbol to watchlist
 */
router.post('/watchlist', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    const { symbol, notes } = req.body;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    const result = await db.query(
      `INSERT INTO user_watchlist (user_id, symbol, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, symbol) DO UPDATE SET notes = EXCLUDED.notes
       RETURNING id, symbol, added_at, notes`,
      [userId, symbol.toUpperCase(), notes || null]
    );

    res.json({
      success: true,
      watchlist: result.rows[0],
    });
  } catch (error) {
    logger.error('Add to watchlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add to watchlist',
    });
  }
});

/**
 * DELETE /api/users/watchlist/:symbol
 * Remove symbol from watchlist
 */
router.delete('/watchlist/:symbol', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    const { symbol } = req.params;

    await db.query(
      'DELETE FROM user_watchlist WHERE user_id = $1 AND symbol = $2',
      [userId, symbol.toUpperCase()]
    );

    res.json({
      success: true,
      message: 'Removed from watchlist',
    });
  } catch (error) {
    logger.error('Remove from watchlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove from watchlist',
    });
  }
});

/**
 * GET /api/users/watchlist
 * Get user's watchlist
 */
router.get('/watchlist', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    const result = await db.query(
      'SELECT id, symbol, added_at, notes FROM user_watchlist WHERE user_id = $1 ORDER BY added_at DESC',
      [userId]
    );

    res.json({
      success: true,
      watchlist: result.rows,
    });
  } catch (error) {
    logger.error('Get watchlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get watchlist',
    });
  }
});

export default router;

