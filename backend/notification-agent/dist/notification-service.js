"use strict";
/**
 * Consolidated Notification Service
 * Combines: Welcome Emails + Daily News Summaries
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = sendWelcomeEmail;
exports.sendDailyNewsSummary = sendDailyNewsSummary;
exports.runDailyNewsJob = runDailyNewsJob;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '/home/it/apps/thesis-report/backend/.env' });
const nodemailer_1 = require("nodemailer");
const generative_ai_1 = require("@google/generative-ai");
const axios_1 = __importDefault(require("axios"));
const mongodb_1 = __importDefault(require("./mongodb"));
const email_templates_1 = require("./email-templates");
const logger_1 = __importDefault(require("./logger"));
// ===========================================
// CONFIGURATION
// ===========================================
// SMTP Configuration
const SMTP_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
};
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_CONFIG.auth.user;
const FROM_NAME = process.env.FROM_NAME || 'Redona Stock Tracker';
// Gemini AI Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
// Finnhub Configuration
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
// Email transporter
const transporter = (0, nodemailer_1.createTransport)(SMTP_CONFIG);
// ===========================================
// 1. WELCOME EMAIL FUNCTIONS
// ===========================================
const WELCOME_EMAIL_PROMPT = `Generate highly personalized HTML content that will be inserted into an email template at the {{intro}} placeholder.

User profile data:
{{userProfile}}

CRITICAL FORMATTING REQUIREMENTS:
- Return ONLY clean HTML content with NO markdown, NO code blocks, NO backticks
- Use SINGLE paragraph only: <p class="mobile-text" style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">content</p>
- Write exactly TWO sentences (add one more sentence than current single sentence)
- Keep total content between 35-50 words for readability
- Use <strong> for key personalized elements (their goals, sectors, etc.)
- DO NOT include "Here's what you can do right now:" as this is already in the template
- Make every word count toward personalization
- Second sentence should add helpful context or reinforce the personalization

Examples of good intros:
- "Based on your focus on <strong>technology</strong> and <strong>medium risk</strong>, you're ready to explore stocks that balance innovation with stability. We'll help you track the right opportunities and make informed decisions."
- "As a <strong>long-term investor</strong> interested in <strong>energy</strong>, you're positioned to capture sector growth. Let's monitor the market together and identify value opportunities."`;
async function generatePersonalizedIntro(event) {
    try {
        const userProfile = JSON.stringify({
            name: event.name,
            country: event.country || 'not specified',
            investmentGoals: event.investmentGoals || 'not specified',
            riskTolerance: event.riskTolerance || 'medium',
            preferredIndustry: event.preferredIndustry || 'not specified'
        }, null, 2);
        const prompt = WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile);
        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text().trim();
        // Clean up markdown artifacts
        text = text.replace(/```html?/gi, '').replace(/```/g, '').trim();
        logger_1.default.info('Generated personalized intro', {
            email: event.email,
            length: text.length
        });
        return text;
    }
    catch (error) {
        logger_1.default.error('Failed to generate personalized intro', { error, email: event.email });
        // Fallback intro
        return `<p class="mobile-text" style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">You're ready to explore stocks and track market opportunities. We'll help you make informed investment decisions.</p>`;
    }
}
async function sendWelcomeEmail(event) {
    try {
        logger_1.default.info('Processing welcome email', { email: event.email, name: event.name });
        // Generate personalized intro
        const personalizedIntro = await generatePersonalizedIntro(event);
        // Fill email template
        const html = (0, email_templates_1.fillTemplate)(email_templates_1.WELCOME_EMAIL_TEMPLATE, {
            name: event.name,
            intro: personalizedIntro
        });
        // Send email
        const info = await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: event.email,
            subject: 'Welcome to Redona - Your Stock Market Journey Begins! 🎉',
            html
        });
        logger_1.default.info('Welcome email sent', {
            email: event.email,
            messageId: info.messageId
        });
        return {
            success: true,
            messageId: info.messageId
        };
    }
    catch (error) {
        logger_1.default.error('Failed to send welcome email', { error, email: event.email });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
// ===========================================
// 2. DAILY NEWS FUNCTIONS
// ===========================================
const NEWS_SUMMARY_PROMPT = `Generate HTML content for a market news summary email that will be inserted into the NEWS_SUMMARY_EMAIL_TEMPLATE at the {{newsContent}} placeholder.

News data to summarize:
{{newsData}}

CRITICAL FORMATTING REQUIREMENTS:
- Return ONLY clean HTML content with NO markdown, NO code blocks, NO backticks
- Structure content with clear sections using proper HTML headings and paragraphs
- Use these specific CSS classes and styles to match the email template:
  - Main section headings: <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #FDD458;">Title</h3>
  - Paragraphs: <p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6; color: #CCDADC;">content</p>
  - Lists: <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #CCDADC;"><li style="margin-bottom: 8px;">item</li></ul>
- Organize into 2-3 key themes or sections
- Each section should be concise (2-3 sentences)
- Highlight key stocks/companies in <strong>SYMBOL</strong> format
- Keep total length to 150-250 words for email readability`;
async function fetchNewsForSymbols(symbols) {
    const articles = [];
    try {
        // Try to fetch company-specific news for each symbol
        for (const symbol of symbols.slice(0, 5)) { // Limit to 5 symbols
            try {
                const url = `${FINNHUB_BASE_URL}/company-news?symbol=${symbol}&from=${getDateString(7)}&to=${getDateString(0)}&token=${FINNHUB_API_KEY}`;
                const response = await axios_1.default.get(url, { timeout: 5000 });
                if (response.data && Array.isArray(response.data)) {
                    articles.push(...response.data.slice(0, 3).map((a) => ({
                        headline: a.headline,
                        summary: a.summary || '',
                        source: a.source,
                        url: a.url,
                        datetime: a.datetime,
                        image: a.image,
                        related: symbol
                    })));
                }
            }
            catch (error) {
                logger_1.default.warn('Failed to fetch news for symbol', { symbol });
            }
        }
        // If no articles, fallback to general market news
        if (articles.length === 0) {
            const url = `${FINNHUB_BASE_URL}/news?category=general&token=${FINNHUB_API_KEY}`;
            const response = await axios_1.default.get(url, { timeout: 5000 });
            if (response.data && Array.isArray(response.data)) {
                articles.push(...response.data.slice(0, 10).map((a) => ({
                    headline: a.headline,
                    summary: a.summary || '',
                    source: a.source,
                    url: a.url,
                    datetime: a.datetime,
                    image: a.image
                })));
            }
        }
        return articles;
    }
    catch (error) {
        logger_1.default.error('Failed to fetch news', { error });
        return [];
    }
}
function getDateString(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
}
async function summarizeNews(articles) {
    try {
        if (articles.length === 0) {
            return '<p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6; color: #CCDADC;">No significant market news today. Check back tomorrow for updates!</p>';
        }
        const prompt = NEWS_SUMMARY_PROMPT.replace('{{newsData}}', JSON.stringify(articles, null, 2));
        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text().trim();
        // Clean up markdown artifacts
        text = text.replace(/```html?/gi, '').replace(/```/g, '').trim();
        logger_1.default.info('Generated news summary', {
            articlesCount: articles.length,
            length: text.length
        });
        return text;
    }
    catch (error) {
        logger_1.default.error('Failed to summarize news', { error });
        return '<p style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.6; color: #CCDADC;">Unable to generate news summary. Please check back later.</p>';
    }
}
// News email template (simplified version)
const NEWS_SUMMARY_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily News Summary - Redona</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #050505;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: #141414; border-radius: 8px; border: 1px solid #30333A;">
                    <tr>
                        <td style="padding: 40px;">
                            <h1 style="margin: 0 0 30px 0; font-size: 24px; font-weight: 600; color: #FDD458;">
                                📰 Daily Market News - {{date}}
                            </h1>
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">
                                Hi {{name}},
                            </p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">
                                Here's your personalized market news summary based on your watchlist:
                            </p>
                            {{newsContent}}
                            <hr style="border: none; border-top: 1px solid #30333A; margin: 40px 0;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6B7280;">
                                Stay informed. Trade smart. 📈
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
async function sendDailyNewsSummary(user, symbols) {
    try {
        logger_1.default.info('Processing daily news for user', { email: user.email, symbols });
        // Fetch news
        const articles = await fetchNewsForSymbols(symbols);
        // Generate summary
        const newsContent = await summarizeNews(articles);
        // Fill template
        const html = (0, email_templates_1.fillTemplate)(NEWS_SUMMARY_EMAIL_TEMPLATE, {
            name: user.name,
            date: new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            newsContent
        });
        // Send email
        const info = await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to: user.email,
            subject: `📰 Your Daily Market News - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            html
        });
        logger_1.default.info('Daily news email sent', {
            email: user.email,
            messageId: info.messageId,
            articlesCount: articles.length
        });
        return {
            success: true,
            messageId: info.messageId
        };
    }
    catch (error) {
        logger_1.default.error('Failed to send daily news', { error, email: user.email });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
// ===========================================
// DAILY NEWS JOB
// ===========================================
async function runDailyNewsJob() {
    const errors = [];
    let emailsSent = 0;
    try {
        logger_1.default.info('Starting daily news job');
        // Connect to MongoDB
        await mongodb_1.default.connect();
        const db = mongodb_1.default.getDatabase();
        // Get all users with emails
        const users = await db
            .collection('user')
            .find({ email: { $exists: true, $ne: null } }, { projection: { _id: 1, id: 1, email: 1, name: 1 } })
            .toArray();
        logger_1.default.info('Found users for daily news', { count: users.length });
        // Process each user
        for (const userData of users) {
            try {
                const user = {
                    id: userData.id || userData._id?.toString() || '',
                    email: userData.email,
                    name: userData.name
                };
                // Get user's watchlist symbols
                const watchlistItems = await db
                    .collection('watchlists')
                    .find({ userId: user.id }, { projection: { symbol: 1 } })
                    .toArray();
                const symbols = watchlistItems.map((item) => item.symbol);
                // Send news summary
                const result = await sendDailyNewsSummary(user, symbols);
                if (result.success) {
                    emailsSent++;
                }
                else {
                    errors.push(`Failed for ${user.email}: ${result.error}`);
                }
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                errors.push(`Failed for user: ${errorMsg}`);
                logger_1.default.error('Failed to process user', { error, userData });
            }
        }
        logger_1.default.info('Daily news job completed', { emailsSent, errors: errors.length });
        return {
            success: true,
            emailsSent,
            errors
        };
    }
    catch (error) {
        logger_1.default.error('Daily news job failed', { error });
        return {
            success: false,
            emailsSent,
            errors: [error instanceof Error ? error.message : 'Unknown error']
        };
    }
}
