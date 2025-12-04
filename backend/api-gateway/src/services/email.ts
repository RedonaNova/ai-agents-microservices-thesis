import nodemailer, { Transporter } from 'nodemailer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import { fillWelcomeTemplate, fillNewsTemplate } from '../utils/email-templates';
import { PERSONALIZED_WELCOME_EMAIL_PROMPT, NEWS_SUMMARY_EMAIL_PROMPT } from '../utils/prompts';
import type { MarketNewsArticle } from '../utils/finnhub';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface UserProfile {
  investmentGoal?: string;
  riskTolerance?: string;
  preferredIndustries?: string[];
}

class EmailService {
  private transporter: Transporter | null = null;
  private genAI: GoogleGenerativeAI | null = null;
  private enabled: boolean;

  constructor() {
    // Check if email is configured
    this.enabled = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      logger.info('✅ Email service configured');
    } else {
      logger.warn('⚠️ Email service not configured (missing EMAIL_USER or EMAIL_PASS)');
    }

    // Initialize Gemini AI
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
      logger.info('✅ Gemini AI configured for email generation');
    } else {
      logger.warn('⚠️ Gemini AI not configured (missing GEMINI_API_KEY)');
    }
  }

  /**
   * Generate personalized intro using Gemini AI
   */
  private async generatePersonalizedIntro(userProfile: UserProfile): Promise<string> {
    if (!this.genAI) {
      return `<p class="mobile-text" style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">Thanks for joining Redona! We're excited to help you track and analyze stocks from both global and Mongolian markets. Let's get started on your investment journey!</p>`;
    }

    try {
      const profileText = `
- Investment goal: ${userProfile.investmentGoal || 'Not specified'}
- Risk tolerance: ${userProfile.riskTolerance || 'Not specified'}
- Preferred industries: ${userProfile.preferredIndustries?.join(', ') || 'Not specified'}
      `.trim();

      const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', profileText);

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Clean up any markdown artifacts
      const cleanText = text
        .replace(/```html/g, '')
        .replace(/```/g, '')
        .trim();

      return cleanText;
    } catch (error) {
      logger.error('Error generating personalized intro', { error });
      return `<p class="mobile-text" style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">Thanks for joining! We're excited to help you make informed investment decisions with real-time data and AI-powered insights. Let's get started!</p>`;
    }
  }

  /**
   * Generate news summary using Gemini AI
   */
  private async generateNewsSummary(articles: MarketNewsArticle[]): Promise<string> {
    if (!this.genAI || articles.length === 0) {
      return `<p class="mobile-text dark-text-secondary" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">No market news available today.</p>`;
    }

    try {
      const newsData = JSON.stringify(articles, null, 2);
      const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}', newsData);

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Clean up any markdown artifacts
      const cleanText = text
        .replace(/```html/g, '')
        .replace(/```/g, '')
        .trim();

      return cleanText;
    } catch (error) {
      logger.error('Error generating news summary', { error });
      
      // Fallback to simple news list
      let html = '<h3 class="mobile-news-title dark-text" style="margin: 30px 0 15px 0; font-size: 18px; font-weight: 600; color: #f8f9fa;">📰 Today\'s Market News</h3>';
      
      articles.slice(0, 6).forEach(article => {
        html += `
          <div class="dark-info-box" style="background-color: #212328; padding: 24px; margin: 20px 0; border-radius: 8px;">
            <h4 class="dark-text" style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #FDD458;">${article.headline}</h4>
            <p class="mobile-text dark-text-secondary" style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #CCDADC;">${article.summary || 'Click to read more.'}</p>
            <div style="margin: 16px 0 0 0;">
              <a href="${article.url}" style="color: #FDD458; text-decoration: none; font-weight: 500; font-size: 14px;" target="_blank">Read Full Story →</a>
            </div>
          </div>
        `;
      });
      
      return html;
    }
  }

  /**
   * Send welcome email with personalized intro
   */
  async sendWelcomeEmail(
    to: string,
    name: string,
    userProfile: UserProfile
  ): Promise<boolean> {
    try {
      // Generate personalized intro
      const intro = await this.generatePersonalizedIntro(userProfile);

      // Fill template
      const html = fillWelcomeTemplate(name, intro);

      // Send email
      await this.send({
        to,
        subject: '🎉 Welcome to Redona - Your AI Investment Advisor',
        html,
        text: `Welcome to Redona, ${name}! We're excited to help you make informed investment decisions.`
      });

      logger.info('✅ Welcome email sent', { to });
      return true;
    } catch (error) {
      logger.error('Failed to send welcome email', { error, to });
      return false;
    }
  }

  /**
   * Send daily news summary email
   */
  async sendNewsSummary(
    to: string,
    articles: MarketNewsArticle[],
    date: string
  ): Promise<boolean> {
    try {
      // Generate news summary
      const newsContent = await this.generateNewsSummary(articles);

      // Fill template
      const html = fillNewsTemplate(date, newsContent);

      // Send email
      await this.send({
        to,
        subject: `📰 Your Daily Market News - ${date}`,
        html,
        text: `Market news summary for ${date}`
      });

      logger.info('✅ News summary email sent', { to, articleCount: articles.length });
      return true;
    } catch (error) {
      logger.error('Failed to send news summary email', { error, to });
      return false;
    }
  }

  /**
   * Send generic email
   */
  private async send(options: EmailOptions): Promise<void> {
    if (!this.enabled || !this.transporter) {
      logger.info(`[DEMO MODE] Email to ${options.to}: ${options.subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"Redona AI Advisor" <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
      });
    } catch (error: any) {
      logger.error('Failed to send email', {
        error: error.message,
        to: options.to,
      });
      throw error;
    }
  }

  /**
   * Verify email configuration
   */
  async verify(): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service verified successfully');
      return true;
    } catch (error: any) {
      logger.error('Email service verification failed', {
        error: error.message,
      });
      return false;
    }
  }
}

export default new EmailService();
