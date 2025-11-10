/**
 * AI Prompts for Email Generation
 */

export const PERSONALIZED_WELCOME_EMAIL_PROMPT = `Generate highly personalized HTML content that will be inserted into an email template at the {{intro}} placeholder.

User profile data:
{{userProfile}}

PERSONALIZATION REQUIREMENTS:

You MUST create content that is obviously tailored to THIS specific user by:

IMPORTANT: Do NOT start the personalized content with "Welcome" since the email header already says "Welcome aboard {{name}}". Use alternative openings like "Thanks for joining", "Great to have you", "You're all set", "Perfect timing", etc.

1. **Direct Reference to User Details**: Extract and use specific information from their profile:
   - Their exact investment goals or objectives
   - Their stated risk tolerance level
   - Their preferred sectors/industries mentioned

2. **Contextual Messaging**: Create content that shows you understand their situation:
   - New investors → Reference learning/starting their journey
   - Experienced traders → Reference advanced tools/strategy enhancement  
   - Specific sectors → Reference those exact industries by name
   - Conservative approach → Reference safety and informed decisions
   - Aggressive approach → Reference opportunities and growth potential

3. **Personal Touch**: Make it feel like it was written specifically for them

CRITICAL FORMATTING REQUIREMENTS:
- Return ONLY clean HTML content with NO markdown, NO code blocks, NO backticks
- Use SINGLE paragraph only: <p class="mobile-text" style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">content</p>
- Write exactly TWO sentences
- Keep total content between 35-50 words for readability
- Use <strong> for key personalized elements

Example:
<p class="mobile-text" style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">Thanks for joining! As someone focused on <strong>technology growth stocks</strong>, you'll love our real-time alerts. We'll help you spot opportunities before they become mainstream news.</p>`;

export const NEWS_SUMMARY_EMAIL_PROMPT = `Generate HTML content for a market news summary email.

News data to summarize:
{{newsData}}

CRITICAL FORMATTING REQUIREMENTS:
- Return ONLY clean HTML content with NO markdown, NO code blocks
- Use clear sections with proper HTML

SECTION HEADINGS:
<h3 class="mobile-news-title dark-text" style="margin: 30px 0 15px 0; font-size: 18px; font-weight: 600; color: #f8f9fa; line-height: 1.3;">Section Title</h3>

ARTICLE CONTAINER:
<div class="dark-info-box" style="background-color: #212328; padding: 24px; margin: 20px 0; border-radius: 8px;">
<h4 class="dark-text" style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #FDD458; line-height: 1.4;">Article Title</h4>
<ul style="margin: 16px 0 20px 0; padding-left: 0; margin-left: 0; list-style: none;">
  <li class="dark-text-secondary" style="margin: 0 0 16px 0; padding: 0; font-size: 16px; line-height: 1.6; color: #CCDADC;">
    <span style="color: #FDD458; font-weight: bold; font-size: 20px; margin-right: 8px;">•</span>Clear explanation in simple terms
  </li>
</ul>
<div style="background-color: #141414; border: 1px solid #374151; padding: 15px; border-radius: 6px; margin: 16px 0;">
<p class="dark-text-secondary" style="margin: 0; font-size: 14px; color: #CCDADC; line-height: 1.4;">💡 <strong style="color: #FDD458;">Bottom Line:</strong> Simple explanation</p>
</div>
<div style="margin: 20px 0 0 0;">
<a href="URL" style="color: #FDD458; text-decoration: none; font-weight: 500; font-size: 14px;">Read Full Story →</a>
</div>
</div>

Content guidelines:
- Use icons: 📊 Market Overview, 📈 Top Gainers, 📉 Top Losers, 🔥 Breaking News
- Minimum 3 concise bullet points per article
- Use PLAIN ENGLISH - no jargon
- Include "Bottom Line" in everyday language
- Always include "Read Full Story" with actual URLs`;

