import nodemailer, { Transporter } from 'nodemailer';
import logger from './logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private enabled: boolean;

  constructor() {
    // Check if email is configured
    this.enabled = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      logger.info('✅ Email service configured');
    } else {
      logger.warn('⚠️ Email service not configured (missing EMAIL_USER or EMAIL_PASS)');
    }
  }

  async sendWelcomeEmail(userEmail: string, userName: string, userPreferences: any): Promise<void> {
    if (!this.enabled) {
      logger.info(`[DEMO MODE] Would send welcome email to ${userEmail}`);
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .preferences { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to MSE AI Advisor!</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName}! 👋</h2>
            <p>Thank you for joining our AI-powered stock analysis platform for the Mongolian Stock Exchange.</p>
            
            <div class="preferences">
              <h3>Your Investment Profile:</h3>
              <ul>
                <li><strong>Investment Goal:</strong> ${userPreferences.investmentGoal || 'Not specified'}</li>
                <li><strong>Risk Tolerance:</strong> ${userPreferences.riskTolerance || 'Not specified'}</li>
                <li><strong>Preferred Industries:</strong> ${userPreferences.preferredIndustries?.join(', ') || 'Not specified'}</li>
              </ul>
            </div>

            <p>Our AI agents are ready to help you with:</p>
            <ul>
              <li>📊 Portfolio analysis and recommendations</li>
              <li>📰 Real-time news sentiment analysis</li>
              <li>📈 MSE market insights in Mongolian</li>
              <li>⚠️ Risk assessment and alerts</li>
            </ul>

            <p>Get started by exploring your dashboard and asking our AI agents for investment advice!</p>

            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Go to Dashboard</a>

            <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
              This platform is part of a bachelor's thesis demonstrating event-driven AI agent architecture.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to MSE AI Advisor, ${userName}!
      
      Your Investment Profile:
      - Investment Goal: ${userPreferences.investmentGoal || 'Not specified'}
      - Risk Tolerance: ${userPreferences.riskTolerance || 'Not specified'}
      - Preferred Industries: ${userPreferences.preferredIndustries?.join(', ') || 'Not specified'}
      
      Our AI agents are ready to help you with portfolio analysis, news sentiment analysis, and market insights.
      
      Visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
    `;

    try {
      await this.send({
        to: userEmail,
        subject: '🎉 Welcome to MSE AI Advisor!',
        html,
        text,
      });
      logger.info(`Welcome email sent to ${userEmail}`);
    } catch (error) {
      logger.error(`Failed to send welcome email to ${userEmail}:`, error);
    }
  }

  async send(options: EmailOptions): Promise<void> {
    if (!this.enabled || !this.transporter) {
      logger.info(`[DEMO MODE] Email to ${options.to}: ${options.subject}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"MSE AI Advisor" <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html,
      });

      logger.info(`Email sent: ${info.messageId}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async verify(): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service verified successfully');
      return true;
    } catch (error) {
      logger.error('Email service verification failed:', error);
      return false;
    }
  }
}

const emailService = new EmailService();

export default emailService;

