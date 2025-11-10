/**
 * Email Templates
 */

export const WELCOME_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Redona</title>
    <style type="text/css">
        @media (prefers-color-scheme: dark) {
            .email-container { background-color: #141414 !important; border: 1px solid #30333A !important; }
            .dark-bg { background-color: #050505 !important; }
            .dark-text { color: #ffffff !important; }
            .dark-text-secondary { color: #9ca3af !important; }
            .dark-text-muted { color: #6b7280 !important; }
        }
        @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; margin: 0 !important; }
            .mobile-padding { padding: 24px !important; }
            .mobile-text { font-size: 14px !important; line-height: 1.5 !important; }
            .mobile-title { font-size: 24px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #050505;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-container" style="max-width: 600px; background-color: #141414; border-radius: 8px; border: 1px solid #30333A;">
                    
                    <tr>
                        <td align="left" style="padding: 40px 40px 20px 40px;">
                            <img src="https://ik.imagekit.io/a6fkjou7d/logo.png?updatedAt=1756378431634" alt="Redona Logo" width="150" style="max-width: 100%; height: auto;">
                        </td>
                    </tr>
                    
                    <tr>
                        <td class="mobile-padding" style="padding: 40px;">
                            
                            <h1 class="mobile-title dark-text" style="margin: 0 0 20px 0; font-size: 28px; font-weight: 600; color: #FDD458; line-height: 1.2;">
                                Welcome aboard, {{name}}!
                            </h1>
                            
                            {{intro}}
                            
                            <h2 class="dark-text" style="margin: 30px 0 15px 0; font-size: 18px; font-weight: 600; color: #f8f9fa;">
                                Here's what you can do right now:
                            </h2>
                            
                            <div class="dark-info-box" style="background-color: #212328; padding: 20px; margin: 20px 0; border-radius: 8px;">
                                <p class="dark-text" style="margin: 0 0 12px 0; font-size: 16px; font-weight: 500; color: #FDD458;">
                                    📈 Build Your Watchlist
                                </p>
                                <p class="mobile-text dark-text-secondary" style="margin: 0; font-size: 14px; line-height: 1.5; color: #CCDADC;">
                                    Track stocks from both global and Mongolian Stock Exchange (MSE). Get real-time updates on your favorite companies.
                                </p>
                            </div>
                            
                            <div class="dark-info-box" style="background-color: #212328; padding: 20px; margin: 20px 0; border-radius: 8px;">
                                <p class="dark-text" style="margin: 0 0 12px 0; font-size: 16px; font-weight: 500; color: #FDD458;">
                                    🤖 Chat with AI Advisor
                                </p>
                                <p class="mobile-text dark-text-secondary" style="margin: 0; font-size: 14px; line-height: 1.5; color: #CCDADC;">
                                    Ask questions in English or Mongolian. Get personalized investment recommendations powered by our event-driven AI agents.
                                </p>
                            </div>
                            
                            <div class="dark-info-box" style="background-color: #212328; padding: 20px; margin: 20px 0; border-radius: 8px;">
                                <p class="dark-text" style="margin: 0 0 12px 0; font-size: 16px; font-weight: 500; color: #FDD458;">
                                    📰 Get Daily News
                                </p>
                                <p class="mobile-text dark-text-secondary" style="margin: 0; font-size: 14px; line-height: 1.5; color: #CCDADC;">
                                    Receive personalized market news based on your watchlist. Stay informed without the noise.
                                </p>
                            </div>
                            
                            <div style="text-align: center; margin: 40px 0 20px 0;">
                                <a href="http://localhost:3000" style="display: inline-block; padding: 14px 32px; background-color: #FDD458; color: #000000; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                                    Get Started →
                                </a>
                            </div>
                            
                            <div style="text-align: center; margin: 40px 0 0 0; padding-top: 30px; border-top: 1px solid #30333A;">
                                <p class="mobile-text dark-text-muted" style="margin: 0 0 10px 0; font-size: 12px; line-height: 1.5; color: #6b7280;">
                                    You're receiving this because you signed up for Redona.
                                </p>
                                <p class="mobile-text dark-text-muted" style="margin: 0; font-size: 12px; line-height: 1.5; color: #6b7280;">
                                    © 2025 Redona. Built with ❤️ for smarter investing.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

export const NEWS_SUMMARY_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Market News Summary</title>
    <style type="text/css">
        @media (prefers-color-scheme: dark) {
            .email-container { background-color: #141414 !important; border: 1px solid #30333A !important; }
            .dark-bg { background-color: #050505 !important; }
            .dark-text { color: #ffffff !important; }
            .dark-text-secondary { color: #9ca3af !important; }
            .dark-text-muted { color: #6b7280 !important; }
            .dark-border { border-color: #30333A !important; }
        }
        @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; margin: 0 !important; }
            .mobile-padding { padding: 24px !important; }
            .mobile-header-padding { padding: 24px 24px 12px 24px !important; }
            .mobile-text { font-size: 14px !important; line-height: 1.5 !important; }
            .mobile-title { font-size: 24px !important; line-height: 1.3 !important; }
            .mobile-news-title { font-size: 16px !important; line-height: 1.3 !important; }
            .mobile-outer-padding { padding: 20px 10px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #050505;">
        <tr>
            <td align="center" class="mobile-outer-padding" style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-container" style="max-width: 600px; background-color: #141414; border-radius: 8px; border: 1px solid #30333A;">
                    
                    <tr>
                        <td align="left" class="mobile-header-padding" style="padding: 40px 40px 20px 40px;">
                            <img src="https://ik.imagekit.io/a6fkjou7d/logo.png?updatedAt=1756378431634" alt="Redona Logo" width="150" style="max-width: 100%; height: auto;">
                        </td>
                    </tr>
                    
                    <tr>
                        <td class="mobile-padding" style="padding: 40px 40px 40px 40px;">
                            
                            <h1 class="mobile-title dark-text" style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #FDD458; line-height: 1.2;">
                                Market News Summary Today
                            </h1>
                            
                            <p class="mobile-text dark-text-muted" style="margin: 0 0 30px 0; font-size: 14px; line-height: 1.4; color: #6b7280;">
                                {{date}}
                            </p>
                            
                            {{newsContent}}
                            
                            <div style="text-align: center; margin: 40px 0 0 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.5; color: #CCDADC !important;">
                                    You're receiving this because you subscribed to Redona news updates.
                                </p>
                                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #CCDADC !important;">
                                    © 2025 Redona
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

/**
 * Fill welcome email template
 */
export function fillWelcomeTemplate(name: string, intro: string): string {
  return WELCOME_EMAIL_TEMPLATE
    .replace('{{name}}', name)
    .replace('{{intro}}', intro);
}

/**
 * Fill news email template
 */
export function fillNewsTemplate(date: string, newsContent: string): string {
  return NEWS_SUMMARY_EMAIL_TEMPLATE
    .replace('{{date}}', date)
    .replace('{{newsContent}}', newsContent);
}

