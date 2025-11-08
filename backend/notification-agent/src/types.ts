/**
 * Consolidated Notification Agent Types
 */

// Notification types
export type NotificationType = 'welcome_email' | 'daily_news';

// ===========================================
// WELCOME EMAIL TYPES
// ===========================================

export interface UserRegistrationEvent {
  requestId: string;
  email: string;
  name: string;
  country?: string;
  investmentGoals?: string;
  riskTolerance?: string;
  preferredIndustry?: string;
  timestamp: string;
}

export interface UserProfile {
  name: string;
  email: string;
  country?: string;
  investmentGoals?: string;
  riskTolerance?: string;
  preferredIndustry?: string;
}

export interface WelcomeEmailData {
  to: string;
  name: string;
  personalizedIntro: string;
}

// ===========================================
// DAILY NEWS TYPES
// ===========================================

export interface User {
  id: string;
  email: string;
  name: string;
  country?: string;
}

export interface WatchlistItem {
  userId: string;
  symbol: string;
  addedAt?: Date;
}

export interface NewsArticle {
  category?: string;
  datetime?: number;
  headline: string;
  id?: number;
  image?: string;
  related?: string;
  source: string;
  summary?: string;
  url: string;
}

export interface UserNewsData {
  user: User;
  symbols: string[];
  articles: NewsArticle[];
}

export interface NewsSummaryEmail {
  to: string;
  name: string;
  date: string;
  newsContent: string;
}

export interface DailyNewsJobEvent {
  jobId: string;
  triggeredAt: string;
  type: 'manual' | 'cron';
}

// ===========================================
// SHARED TYPES
// ===========================================

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationResponse {
  requestId: string;
  type: NotificationType;
  success: boolean;
  message: string;
  emailsSent: number;
  errors: string[];
  timestamp: string;
}

