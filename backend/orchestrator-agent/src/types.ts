/**
 * Type definitions for Orchestrator Agent
 */

// User request from frontend
export interface UserRequest {
  requestId: string;
  userId: string;
  message: string;
  context?: {
    portfolio?: any;
    watchlist?: string[];
    preferences?: any;
  };
  timestamp: string;
}

// Intent classification result
export interface IntentClassification {
  intent: AgentIntent;
  confidence: number;
  entities?: Record<string, any>;
  parameters?: Record<string, any>;
}

// Available agent intents
export enum AgentIntent {
  PORTFOLIO_ADVICE = 'portfolio_advice',
  MARKET_ANALYSIS = 'market_analysis',
  NEWS_QUERY = 'news_query',
  HISTORICAL_ANALYSIS = 'historical_analysis',
  RISK_ASSESSMENT = 'risk_assessment',
  GENERAL_QUERY = 'general_query',
  UNKNOWN = 'unknown'
}

// Routing decision
export interface RoutingDecision {
  targetAgent: string;
  targetTopic: string;
  priority: 'low' | 'medium' | 'high';
  requiresAggregation: boolean;
  subAgents?: string[]; // Multiple agents if needed
}

// Agent request to specialized agents
export interface AgentRequest {
  requestId: string;
  userId: string;
  intent: AgentIntent;
  originalMessage: string;
  parameters: Record<string, any>;
  context: {
    portfolio?: any;
    watchlist?: string[];
    preferences?: any;
  };
  timestamp: string;
  sourceAgent: 'orchestrator';
}

// Agent response from specialized agents
export interface AgentResponse {
  requestId: string;
  agentName: string;
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
  processingTime?: number;
  timestamp: string;
}

// Final user response
export interface UserResponse {
  requestId: string;
  userId: string;
  success: boolean;
  message: string;
  data?: any;
  sources?: string[]; // Which agents contributed
  processingTime: number;
  timestamp: string;
}

// Agent registry entry
export interface AgentInfo {
  name: string;
  topic: string;
  capabilities: AgentIntent[];
  status: 'active' | 'inactive' | 'error';
  lastHeartbeat?: string;
}

