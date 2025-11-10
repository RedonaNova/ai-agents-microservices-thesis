import logger from './logger';

/**
 * Complexity Detector
 * 
 * Determines if a query requires:
 * - Simple: Single agent, straightforward request
 * - Complex: Multiple agents, requires planning/orchestration
 */

interface ComplexityResult {
  level: 'simple' | 'complex';
  confidence: number;
  requiredAgents: string[];
  reasoning: string;
}

class ComplexityDetector {
  /**
   * Detect query complexity
   */
  async detect(query: string, intent: string, context: any): Promise<ComplexityResult> {
    const queryLower = query.toLowerCase();

    // Multi-step indicators
    const multiStepKeywords = [
      'and then',
      'after that',
      'also',
      'additionally',
      'compare',
      'both',
      'multiple',
    ];

    // Multi-agent indicators
    const multiAgentKeywords = [
      'analyze portfolio and news',
      'risk and returns',
      'compare multiple stocks',
      'diversification',
      'comprehensive analysis',
    ];

    // Check for multi-step query
    const hasMultiStep = multiStepKeywords.some(keyword =>
      queryLower.includes(keyword)
    );

    // Check for multi-agent requirement
    const hasMultiAgent = multiAgentKeywords.some(keyword =>
      queryLower.includes(keyword)
    );

    // Check context complexity
    const hasComplexContext =
      (context?.symbols && context.symbols.length > 3) ||
      (context?.compareWith && context.compareWith.length > 0);

    // Determine complexity
    if (hasMultiStep || hasMultiAgent || hasComplexContext) {
      return {
        level: 'complex',
        confidence: 0.8,
        requiredAgents: this.identifyRequiredAgents(query, intent, context),
        reasoning: 'Query requires multi-step or multi-agent processing',
      };
    }

    // Simple query
    return {
      level: 'simple',
      confidence: 0.9,
      requiredAgents: [this.getAgentForIntent(intent)],
      reasoning: 'Single-agent query can be processed directly',
    };
  }

  /**
   * Identify which agents are needed for complex query
   */
  private identifyRequiredAgents(query: string, intent: string, context: any): string[] {
    const agents: Set<string> = new Set();
    const queryLower = query.toLowerCase();

    // Add base agent for intent
    agents.add(this.getAgentForIntent(intent));

    // Check for additional agent requirements
    if (queryLower.includes('news') || queryLower.includes('sentiment')) {
      agents.add('news-agent');
    }

    if (queryLower.includes('risk') || queryLower.includes('volatility')) {
      agents.add('investment-agent'); // Handles risk too
    }

    if (queryLower.includes('historical') || queryLower.includes('trend')) {
      agents.add('investment-agent'); // Handles historical analysis
    }

    // Always include knowledge agent for RAG context
    if (queryLower.includes('компани') || queryLower.includes('APU') || queryLower.includes('TDB')) {
      agents.add('knowledge-agent');
    }

    return Array.from(agents);
  }

  /**
   * Map intent to agent
   */
  private getAgentForIntent(intent: string): string {
    const mapping: Record<string, string> = {
      'portfolio': 'investment-agent',
      'portfolio_advice': 'investment-agent',
      'market_analysis': 'investment-agent',
      'risk_assessment': 'investment-agent',
      'historical_analysis': 'investment-agent',
      'news': 'news-agent',
      'news_query': 'news-agent',
      'sentiment': 'news-agent',
    };

    return mapping[intent] || 'investment-agent';
  }
}

const complexityDetector = new ComplexityDetector();

export default complexityDetector;

