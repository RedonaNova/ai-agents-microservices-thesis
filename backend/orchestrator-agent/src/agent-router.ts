import { AgentIntent, RoutingDecision, AgentInfo } from './types';
import logger from './logger';

/**
 * Agent Router - Routes requests to appropriate specialized agents
 */
class AgentRouter {
  // Registry of available agents and their capabilities
  private agentRegistry: Map<string, AgentInfo> = new Map([
    [
      'portfolio-advisor',
      {
        name: 'portfolio-advisor',
        topic: 'portfolio-events',
        capabilities: [AgentIntent.PORTFOLIO_ADVICE],
        status: 'active'
      }
    ],
    [
      'market-analysis',
      {
        name: 'market-analysis',
        topic: 'market-analysis-events',
        capabilities: [AgentIntent.MARKET_ANALYSIS],
        status: 'active'
      }
    ],
    [
      'news-intelligence',
      {
        name: 'news-intelligence',
        topic: 'news-events',
        capabilities: [AgentIntent.NEWS_QUERY],
        status: 'active'
      }
    ],
    [
      'historical-analysis',
      {
        name: 'historical-analysis',
        topic: 'market-analysis-events', // Shares topic with market analysis
        capabilities: [AgentIntent.HISTORICAL_ANALYSIS],
        status: 'active'
      }
    ],
    [
      'risk-assessment',
      {
        name: 'risk-assessment',
        topic: 'risk-assessment-events',
        capabilities: [AgentIntent.RISK_ASSESSMENT],
        status: 'active'
      }
    ]
  ]);

  /**
   * Route a request to the appropriate agent(s)
   */
  route(intent: AgentIntent, confidence: number): RoutingDecision {
    logger.info('Routing request', { intent, confidence });

    // Find matching agent(s)
    const matchingAgents = Array.from(this.agentRegistry.values()).filter(
      agent => agent.capabilities.includes(intent) && agent.status === 'active'
    );

    if (matchingAgents.length === 0) {
      logger.warn('No matching agent found', { intent });
      
      // Fallback to general query handling by portfolio advisor
      return {
        targetAgent: 'portfolio-advisor',
        targetTopic: 'portfolio-events',
        priority: 'low',
        requiresAggregation: false
      };
    }

    // Get the first matching agent (in production, could implement load balancing here)
    const selectedAgent = matchingAgents[0];

    // Determine priority based on confidence
    const priority = this.determinePriority(confidence);

    // Check if multiple agents should be involved
    const requiresAggregation = this.shouldAggregate(intent);

    const routing: RoutingDecision = {
      targetAgent: selectedAgent.name,
      targetTopic: selectedAgent.topic,
      priority,
      requiresAggregation
    };

    // For complex queries, might need multiple agents
    if (requiresAggregation) {
      routing.subAgents = matchingAgents.slice(1, 3).map(a => a.name);
    }

    logger.info('Routing decision made', routing);
    return routing;
  }

  /**
   * Determine request priority based on confidence
   */
  private determinePriority(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Determine if request should be sent to multiple agents
   */
  private shouldAggregate(intent: AgentIntent): boolean {
    // Some intents benefit from multiple agent perspectives
    const multiAgentIntents = [
      AgentIntent.PORTFOLIO_ADVICE, // May need risk + market + historical
      AgentIntent.RISK_ASSESSMENT   // May need historical + market data
    ];

    return multiAgentIntents.includes(intent);
  }

  /**
   * Get agent information
   */
  getAgent(agentName: string): AgentInfo | undefined {
    return this.agentRegistry.get(agentName);
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): AgentInfo[] {
    return Array.from(this.agentRegistry.values()).filter(
      agent => agent.status === 'active'
    );
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentName: string, status: 'active' | 'inactive' | 'error'): void {
    const agent = this.agentRegistry.get(agentName);
    if (agent) {
      agent.status = status;
      agent.lastHeartbeat = new Date().toISOString();
      logger.info('Agent status updated', { agentName, status });
    }
  }

  /**
   * Register a new agent dynamically
   */
  registerAgent(agent: AgentInfo): void {
    this.agentRegistry.set(agent.name, agent);
    logger.info('Agent registered', { name: agent.name, capabilities: agent.capabilities });
  }
}

// Export singleton instance
export default new AgentRouter();

