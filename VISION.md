# AI Agents for Microservices - Thesis Demo Application Vision

## Executive Summary

This document outlines the vision and implementation plan for a demonstration application that showcases **AI agents within an Event-Driven microservices architecture** for stock market analysis. The demo aligns with the bachelor thesis theoretical framework, implementing the proposed architecture using Apache Kafka, Apache Flink, and AI agents.

## Application Overview

**Domain**: Stock Market Analysis Platform
- **Target Markets**: Global stocks (US, Asian markets) and Mongolian Stock Exchange (MSE)
- **Primary Users**: Individual investors, portfolio managers, financial analysts
- **Core Value Proposition**: AI-powered intelligent stock analysis with personalized recommendations

## Theoretical Alignment

The demo application implements the key concepts from the thesis:

### 1. AI Agent Architecture (Chapter: Хиймэл оюуны агентууд)
- **Orchestrator Agent**: Coordinates user requests and routes them to appropriate service agents
- **Portfolio Advisor Agent**: Provides personalized investment recommendations
- **Market Analysis Agent**: Analyzes market trends and patterns
- **News Intelligence Agent**: Processes and summarizes financial news
- **Risk Assessment Agent**: Evaluates portfolio risk and suggests rebalancing
- **Historical Analysis Agent**: Performs technical analysis on historical data

### 2. Event-Driven Architecture (Chapter: Event-Driven архитектур)
- Apache Kafka as the event backbone
- Asynchronous communication between agents
- Event sourcing for audit trails
- Apache Flink for stream processing

### 3. RAG System (Chapter: Retrieval-Augmented Generation)
- Vector database for storing market insights, company profiles, and historical analysis
- Contextual retrieval for accurate AI responses
- Reduced hallucination through grounded information

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│                      (Next.js Frontend)                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Kafka Topics         │
         │  - user-requests       │
         │  - agent-tasks         │
         │  - agent-responses     │
         │  - monitoring-events   │
         └────────┬───────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┬─────────────┐
    ▼             ▼             ▼             ▼             ▼
┌────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Orchestr│  │Portfolio │  │Market    │  │News      │  │Historical│
│ator    │  │Advisor   │  │Analysis  │  │Intel     │  │Analysis  │
│Agent   │  │Agent     │  │Agent     │  │Agent     │  │Agent     │
└────┬───┘  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘
     │            │              │              │              │
     └────────────┴──────────────┴──────────────┴──────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
              ┌───────────┐            ┌───────────┐
              │Vector DB  │            │PostgreSQL │
              │(Qdrant)   │            │           │
              └───────────┘            └───────────┘
```

## Core Features & Agent Functions

### 1. Personalized Welcome & Onboarding
**Status**: ✅ Implemented (Inngest)
**Migration**: Replace with Orchestrator Agent

**Current Flow**:
- User signs up → Inngest function generates personalized intro email

**Target Flow**:
```
User signs up → Kafka (user-signup event) 
              → Orchestrator Agent 
              → Profile Analysis Agent (analyzes user preferences)
              → Welcome Message Generator Agent
              → Email Service
```

**AI Agent Capabilities**:
- Analyze user investment goals, risk tolerance, preferred industries
- Generate personalized welcome message
- Suggest initial watchlist based on user profile

---

### 2. Daily News Intelligence
**Status**: ✅ Implemented (Inngest)
**Migration**: Replace with News Intelligence Agent

**Current Flow**:
- Cron job → Fetch news → Send email

**Target Flow**:
```
Scheduler → Kafka (daily-news-trigger)
          → News Intelligence Agent
          → RAG (retrieve relevant company info)
          → Summarization & Sentiment Analysis
          → Kafka (personalized-news-ready)
          → Email Service
```

**AI Agent Capabilities**:
- Fetch news from multiple sources (Finnhub, Alpha Vantage, MSE)
- Sentiment analysis (positive, negative, neutral)
- Relevance scoring based on user watchlist
- Multi-article summarization
- Impact assessment on portfolio

**Demo Inputs**:
- User watchlist: ["AAPL", "HDB", "APU.MN"]
- Time range: Last 24 hours

**Expected Output**:
```json
{
  "summary": "Your watchlist shows positive momentum. Apple announced new AI features...",
  "articles": [
    {
      "symbol": "AAPL",
      "headline": "Apple Intelligence Launch",
      "sentiment": "positive",
      "impact": "high",
      "summary": "AI-generated summary..."
    }
  ],
  "portfolio_impact": {
    "overall_sentiment": "bullish",
    "risk_level": "moderate",
    "action_suggested": "Hold current positions"
  }
}
```

---

### 3. Portfolio Advisor Agent
**Status**: ⭕ New Feature

**User Query**: "Should I buy more tech stocks?"

**Agent Workflow**:
```
1. Orchestrator receives query
2. Dispatches to Portfolio Advisor Agent
3. Portfolio Agent:
   - Retrieves user's current portfolio
   - Analyzes current allocation
   - Queries RAG for market trends
   - Calls Market Analysis Agent for sector outlook
   - Calls Risk Assessment Agent
4. Generates personalized recommendation
5. Returns via Kafka to frontend
```

**AI Agent Capabilities**:
- Portfolio composition analysis
- Diversification recommendations
- Risk-adjusted return optimization
- Tax-loss harvesting suggestions
- Rebalancing strategies

**Demo Inputs**:
- Current portfolio: 70% tech, 20% finance, 10% healthcare
- Risk tolerance: Moderate
- Investment goal: Long-term growth
- Query: "Should I buy more tech stocks?"

**Expected Output**:
```json
{
  "recommendation": "Consider reducing tech allocation",
  "reasoning": [
    "Current tech allocation (70%) exceeds recommended 40-50% for moderate risk",
    "Tech sector P/E ratios are elevated compared to historical averages",
    "Diversification into healthcare and consumer staples would reduce volatility"
  ],
  "suggested_actions": [
    {
      "action": "Sell 15% of tech holdings",
      "target_symbols": ["TSLA", "NVDA"],
      "reason": "High valuation, profit-taking"
    },
    {
      "action": "Buy healthcare ETF",
      "suggested_symbols": ["VHT", "XLV"],
      "allocation": "10%"
    }
  ],
  "risk_metrics": {
    "current_sharpe_ratio": 1.2,
    "proposed_sharpe_ratio": 1.5,
    "volatility_reduction": "12%"
  }
}
```

---

### 4. Market Trend Analysis Agent
**Status**: ⭕ New Feature

**User Query**: "What are the current market trends?"

**Agent Workflow**:
```
1. Flink Stream Processing:
   - Continuously ingest market data (prices, volumes)
   - Calculate technical indicators (SMA, EMA, RSI, MACD)
   - Detect patterns (breakouts, support/resistance)
2. Market Trend Agent:
   - Analyzes aggregated data from Flink
   - Queries RAG for historical comparisons
   - LLM generates trend narrative
3. Publishes insights to Kafka topic
```

**AI Agent Capabilities**:
- Sector rotation analysis
- Momentum detection (bullish/bearish)
- Support/resistance level identification
- Volume analysis and interpretation
- Comparison with historical market cycles

**Demo Inputs**:
- Market: S&P 500 + MSE Top 20
- Timeframe: Last 30 days
- User focus: Tech sector

**Expected Output**:
```json
{
  "overall_trend": "bullish",
  "confidence": 0.78,
  "analysis": "The market is showing strong upward momentum...",
  "sectors": {
    "technology": {
      "trend": "bullish",
      "momentum": "strong",
      "key_drivers": ["AI adoption", "Cloud growth"],
      "risk_factors": ["Valuation concerns"]
    },
    "finance": {
      "trend": "neutral",
      "momentum": "weak"
    }
  },
  "technical_signals": [
    {
      "indicator": "50-day SMA crossover",
      "signal": "bullish",
      "description": "Price crossed above 50-day moving average"
    }
  ],
  "historical_comparison": "Similar pattern observed in Q1 2023, resulted in 12% rally over 3 months"
}
```

---

### 5. Historical Analysis Agent
**Status**: ⭕ New Feature

**User Query**: "Analyze AAPL stock performance over the last 5 years"

**Agent Workflow**:
```
1. Orchestrator receives query with symbol + timeframe
2. Historical Analysis Agent:
   - Fetches historical OHLCV data
   - Runs technical analysis (Flink job)
   - Queries RAG for company milestones
   - Identifies key events (earnings, product launches)
   - LLM generates narrative analysis
3. Returns comprehensive report
```

**AI Agent Capabilities**:
- Price action analysis
- Volatility patterns
- Correlation with market indices
- Event-driven price movements
- Seasonality detection
- Support/resistance levels

**Demo Inputs**:
- Symbol: AAPL
- Timeframe: 5 years
- Analysis type: Comprehensive

**Expected Output**:
```json
{
  "symbol": "AAPL",
  "period": "2020-2025",
  "summary": "Apple stock has delivered exceptional returns (250%) driven by...",
  "key_metrics": {
    "total_return": "250%",
    "annualized_return": "28.5%",
    "volatility": "25%",
    "sharpe_ratio": 1.8,
    "max_drawdown": "-32%"
  },
  "key_events": [
    {
      "date": "2023-06-05",
      "event": "Apple Vision Pro Announcement",
      "price_impact": "+5.2%",
      "narrative": "Stock surged on optimism around spatial computing"
    }
  ],
  "technical_patterns": [
    {
      "pattern": "Cup and Handle",
      "identified_date": "2024-03-15",
      "outcome": "Breakout, +18% in 2 months"
    }
  ],
  "future_outlook": "Based on historical patterns, watch for...",
  "comparable_periods": [
    {
      "period": "2016-2017",
      "similarity": 0.82,
      "outcome": "Continued uptrend"
    }
  ]
}
```

---

### 6. Risk Assessment Agent
**Status**: ⭕ New Feature

**User Query**: "How risky is my portfolio?"

**Agent Workflow**:
```
1. Risk Assessment Agent:
   - Fetches user portfolio
   - Calculates VaR, Beta, Correlation matrix
   - Monte Carlo simulation (Flink job)
   - Stress testing scenarios
   - LLM interprets and explains risks
```

**AI Agent Capabilities**:
- Value at Risk (VaR) calculation
- Portfolio Beta analysis
- Correlation and concentration risk
- Downside protection assessment
- Scenario analysis (market crash, recession)
- Personalized risk explanations

**Demo Inputs**:
- Portfolio: Mixed US and Mongolian stocks
- Risk tolerance: Moderate

**Expected Output**:
```json
{
  "overall_risk_score": 6.5,
  "risk_level": "moderate-high",
  "explanation": "Your portfolio carries above-average risk due to concentration in tech sector...",
  "risk_metrics": {
    "value_at_risk_95": "-8.5%",
    "portfolio_beta": 1.35,
    "volatility_annual": "22%"
  },
  "concentration_risks": [
    {
      "type": "sector",
      "sector": "Technology",
      "allocation": "70%",
      "recommendation": "Reduce to 40-50%"
    },
    {
      "type": "geographic",
      "region": "US",
      "allocation": "85%",
      "recommendation": "Consider emerging markets"
    }
  ],
  "stress_scenarios": [
    {
      "scenario": "Tech sector correction (-20%)",
      "portfolio_impact": "-14%",
      "probability": "medium"
    }
  ],
  "mitigation_strategies": [
    "Add defensive stocks (utilities, consumer staples)",
    "Consider hedging with put options",
    "Increase cash allocation to 10%"
  ]
}
```

---

### 7. MSE (Mongolian Stock Exchange) Analysis
**Status**: ⭕ New Feature

**Unique Aspects**:
- Limited liquidity
- Small market cap
- Frontier market characteristics
- Currency risk (MNT/USD)

**Agent Capabilities**:
- MSE-specific metrics (turnover ratio, free float)
- Comparison with frontier markets
- Currency hedging recommendations
- Local economic indicators impact

**Demo Inputs**:
- Symbols: ["APU.MN", "TDB.MN", "TTL.MN"]
- Query: "Compare MSE stocks with US equivalents"

**Expected Output**:
```json
{
  "comparison": {
    "APU.MN": {
      "sector": "Mining",
      "us_comparable": "FCX",
      "valuation": "Cheaper by 40% on P/E basis",
      "liquidity_discount": "25%",
      "risks": ["Political", "Currency", "Liquidity"]
    }
  },
  "mse_market_health": {
    "trend": "neutral",
    "avg_daily_volume_usd": "2.5M",
    "market_cap_total": "1.2B USD"
  },
  "recommendation": "MSE offers value opportunities but requires longer holding periods..."
}
```

---

## Technical Stack

### Backend Services (Microservices)

#### 1. Orchestrator Service (Node.js/TypeScript)
- **Port**: 3001
- **Kafka Topics**: 
  - Consumes: `user-requests`
  - Produces: `agent-tasks`, `user-responses`
- **Responsibilities**:
  - Intent classification
  - Agent routing
  - Response aggregation

#### 2. Portfolio Advisor Service (Python/FastAPI)
- **Port**: 3002
- **LLM**: OpenAI GPT-4 or Claude 3.5 Sonnet
- **Vector DB**: Qdrant
- **Kafka Topics**: 
  - Consumes: `portfolio-tasks`
  - Produces: `portfolio-responses`

#### 3. Market Analysis Service (Python/FastAPI)
- **Port**: 3003
- **Flink Integration**: Streaming analytics
- **Kafka Topics**: 
  - Consumes: `market-analysis-tasks`
  - Produces: `market-analysis-responses`

#### 4. News Intelligence Service (Python/FastAPI)
- **Port**: 3004
- **APIs**: Finnhub, Alpha Vantage
- **Kafka Topics**: 
  - Consumes: `news-tasks`, `daily-news-trigger`
  - Produces: `news-responses`

#### 5. Historical Analysis Service (Python/FastAPI)
- **Port**: 3005
- **Data Source**: yfinance, Finnhub
- **Kafka Topics**: 
  - Consumes: `historical-analysis-tasks`
  - Produces: `historical-analysis-responses`

#### 6. Risk Assessment Service (Python/FastAPI)
- **Port**: 3006
- **Libraries**: NumPy, SciPy, pandas
- **Kafka Topics**: 
  - Consumes: `risk-analysis-tasks`
  - Produces: `risk-analysis-responses`

### Infrastructure

- **Message Broker**: Apache Kafka (Confluent Cloud or Docker)
- **Stream Processing**: Apache Flink
- **Vector Database**: Qdrant (Docker)
- **Primary Database**: PostgreSQL
- **Caching**: Redis
- **Container Orchestration**: Docker Compose (demo) → Kubernetes (production)

### Frontend (Existing Next.js)
- Migrate Inngest functions to Kafka producers
- WebSocket for real-time agent responses
- Server-Sent Events for streaming agent outputs

---

## Data Flow Example: "Analyze my portfolio"

```
1. User types: "Should I rebalance my portfolio?"
   └─> Next.js API route publishes to Kafka topic: user-requests

2. Orchestrator Agent consumes event
   └─> Identifies intent: portfolio_analysis
   └─> Publishes to: portfolio-tasks

3. Portfolio Advisor Agent consumes event
   └─> Fetches user portfolio from PostgreSQL
   └─> Queries Vector DB for similar portfolios
   └─> Calls Risk Assessment Agent (Kafka)
   └─> Calls Market Analysis Agent (Kafka)
   └─> Waits for responses (event correlation)

4. Risk Assessment Agent responds
   └─> Publishes to: risk-analysis-responses

5. Market Analysis Agent responds
   └─> Publishes to: market-analysis-responses

6. Portfolio Advisor aggregates responses
   └─> LLM generates recommendation
   └─> Publishes to: portfolio-responses

7. Orchestrator consumes portfolio-responses
   └─> Publishes to: user-responses (with correlation ID)

8. Frontend (WebSocket) receives response
   └─> Displays AI-generated recommendation with citations
```

**Latency Target**: 3-5 seconds for complex queries

---

## Evaluation Metrics (For Thesis)

### 1. Agent Performance Metrics
- **Response Accuracy**: Compare agent recommendations with expert analysis
- **Latency**: Time from user query to response
- **Token Usage**: Cost efficiency of LLM calls

### 2. Architectural Metrics
- **Throughput**: Requests per second
- **Scalability**: Performance under load (JMeter tests)
- **Fault Tolerance**: System behavior when agents fail

### 3. Comparison with Monolith
Create a comparison table showing:

| Metric | Monolith (Inngest) | Event-Driven Microservices |
|--------|-------------------|----------------------------|
| Deployment Flexibility | Low | High |
| Scalability | Vertical only | Horizontal |
| Latency | 2-3s | 3-5s |
| Fault Isolation | No | Yes |
| Agent Independence | No | Yes |
| Cost (at scale) | Higher | Lower |

### 4. RAG Effectiveness
- **Retrieval Precision**: Relevant docs retrieved / Total docs retrieved
- **Hallucination Rate**: Factually incorrect statements
- **Citation Accuracy**: Correct attribution of sources

### 5. User Experience Metrics
- **Query Understanding Accuracy**: Intent classification correctness
- **Response Quality**: User satisfaction (simulated or actual)
- **Explainability**: Can users understand AI reasoning?

---

## Demo Scenarios for Thesis Defense

### Scenario 1: New User Onboarding
1. User signs up with profile (tech investor, moderate risk)
2. Orchestrator Agent generates personalized welcome
3. Shows Event flow in Kafka UI
4. Demonstrates async processing

### Scenario 2: Daily News Intelligence
1. Trigger daily news job
2. Show News Agent consuming events
3. Display sentiment analysis + summarization
4. Show email sent with personalized insights

### Scenario 3: Portfolio Rebalancing
1. User query: "Should I rebalance?"
2. Show multi-agent collaboration:
   - Portfolio Agent
   - Risk Agent
   - Market Agent
3. Display final recommendation with reasoning

### Scenario 4: System Resilience
1. Simulate agent failure (kill Portfolio Agent container)
2. Show other agents continue working
3. Portfolio Agent restarts, resumes from last offset
4. Demonstrate message replay

### Scenario 5: Scalability
1. Load test with 100 concurrent users
2. Show Kafka Consumer Groups distributing load
3. Scale Portfolio Agent to 3 instances
4. Demonstrate throughput increase

---

## Implementation Phases

### Phase 1: Infrastructure Setup (Week 1)
- [ ] Docker Compose for Kafka, Zookeeper, Qdrant, PostgreSQL
- [ ] Kafka topics creation
- [ ] Database schema design
- [ ] Basic Orchestrator Agent

### Phase 2: Core Agents (Week 2-3)
- [ ] Portfolio Advisor Agent
- [ ] Market Analysis Agent
- [ ] News Intelligence Agent
- [ ] RAG system setup

### Phase 3: Advanced Agents (Week 3-4)
- [ ] Historical Analysis Agent
- [ ] Risk Assessment Agent
- [ ] Flink stream processing jobs

### Phase 4: Frontend Integration (Week 4-5)
- [ ] Migrate Inngest to Kafka
- [ ] WebSocket real-time updates
- [ ] New UI components for agent features

### Phase 5: Evaluation & Testing (Week 5-6)
- [ ] Performance benchmarks
- [ ] Agent accuracy evaluation
- [ ] Comparison with monolith approach
- [ ] Generate evaluation metrics for thesis

---

## Success Criteria

1. **Functional**: All 6 agents working end-to-end
2. **Demonstrable**: Live demo shows event-driven flow
3. **Measurable**: Evaluation metrics show benefits over monolith
4. **Aligned**: Implementation matches thesis theoretical framework
5. **Scalable**: System handles 100+ concurrent users
6. **Resilient**: Agents recover from failures automatically

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LLM API costs high | High | Use smaller models (GPT-3.5), caching |
| Kafka setup complex | Medium | Use Confluent Cloud or managed service |
| Latency too high | High | Add caching layer, optimize prompts |
| Agent accuracy low | High | Fine-tune prompts, add RAG |
| Time constraints | Critical | Prioritize Phase 1-3, simplify Phase 4-5 |

---

## Open Questions

1. **LLM Choice**: OpenAI (expensive, powerful) vs Anthropic Claude vs Open-source (Llama 3)
2. **Kafka Hosting**: Local Docker vs Confluent Cloud vs AWS MSK
3. **Frontend State**: Polling vs WebSocket vs Server-Sent Events
4. **Authentication**: Simple JWT vs OAuth2
5. **Deployment**: Keep Docker Compose or move to Kubernetes

---

## Next Steps

1. Review and approve this vision document
2. Create detailed implementation plan (PLAN.md)
3. Set up development environment
4. Begin Phase 1: Infrastructure setup
5. Create project board with tasks

---

## Appendix: Kafka Topic Schema

### user-requests
```json
{
  "messageId": "uuid",
  "userId": "string",
  "timestamp": "ISO8601",
  "query": "string",
  "context": {
    "portfolio": [],
    "watchlist": [],
    "preferences": {}
  }
}
```

### agent-tasks
```json
{
  "taskId": "uuid",
  "correlationId": "uuid",
  "agentType": "portfolio|market|news|historical|risk",
  "payload": {},
  "priority": "high|normal|low"
}
```

### agent-responses
```json
{
  "taskId": "uuid",
  "correlationId": "uuid",
  "agentType": "string",
  "status": "success|error",
  "result": {},
  "metadata": {
    "processingTimeMs": 0,
    "tokensUsed": 0,
    "model": "string"
  }
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-07  
**Author**: Б.Раднаабазар  
**Thesis Advisor**: Дэд профессор Б.Сувдаа

