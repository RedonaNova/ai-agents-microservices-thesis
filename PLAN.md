# Implementation Plan - AI Agents for Microservices Demo

## Project Timeline: 6 Weeks

**Start Date**: Week 1  
**Demo Date**: Week 6  
**Thesis Defense**: Week 7-8

---

## Phase 1: Infrastructure & Foundation (Week 1)

### 1.1 Development Environment Setup

**Day 1-2: Docker Infrastructure**

```bash
thesis-report/
├── backend/
│   ├── docker-compose.yml          # Kafka, Zookeeper, Qdrant, PostgreSQL, Redis
│   ├── orchestrator-agent/         # Node.js/TypeScript
│   ├── portfolio-agent/            # Python/FastAPI
│   ├── market-analysis-agent/      # Python/FastAPI
│   ├── news-agent/                 # Python/FastAPI
│   ├── historical-agent/           # Python/FastAPI
│   ├── risk-agent/                 # Python/FastAPI
│   ├── flink-jobs/                 # Java/Python
│   └── shared/
│       ├── proto/                  # Protobuf schemas
│       └── schemas/                # Avro schemas
├── frontend/                        # Next.js (existing)
├── infrastructure/
│   ├── kafka/
│   │   └── topics.sh              # Topic creation script
│   ├── postgres/
│   │   └── schema.sql
│   └── monitoring/
│       └── prometheus.yml
└── docs/
    ├── VISION.md
    └── PLAN.md
```

**Tasks**:
- [ ] Create `backend/docker-compose.yml` with services:
  - Kafka (Confluent)
  - Zookeeper
  - Schema Registry
  - Qdrant Vector DB
  - PostgreSQL
  - Redis
  - Kafka UI (for visualization)
- [ ] Create network configuration
- [ ] Set up volume mounts for persistence
- [ ] Test: `docker-compose up` and verify all services healthy

**Deliverables**:
- Running Kafka cluster (3 brokers for demo)
- Kafka UI accessible at http://localhost:8080
- PostgreSQL accessible at localhost:5432
- Qdrant accessible at localhost:6333

---

**Day 3: Kafka Topics & Schema**

**Topics to Create**:
```bash
# User interaction
kafka-topics --create --topic user-requests --partitions 3 --replication-factor 1
kafka-topics --create --topic user-responses --partitions 3 --replication-factor 1

# Agent orchestration
kafka-topics --create --topic agent-tasks --partitions 6 --replication-factor 1
kafka-topics --create --topic portfolio-tasks --partitions 2 --replication-factor 1
kafka-topics --create --topic portfolio-responses --partitions 2 --replication-factor 1
kafka-topics --create --topic market-analysis-tasks --partitions 2 --replication-factor 1
kafka-topics --create --topic market-analysis-responses --partitions 2 --replication-factor 1
kafka-topics --create --topic news-tasks --partitions 2 --replication-factor 1
kafka-topics --create --topic news-responses --partitions 2 --replication-factor 1
kafka-topics --create --topic historical-tasks --partitions 2 --replication-factor 1
kafka-topics --create --topic historical-responses --partitions 2 --replication-factor 1
kafka-topics --create --topic risk-tasks --partitions 2 --replication-factor 1
kafka-topics --create --topic risk-responses --partitions 2 --replication-factor 1

# System events
kafka-topics --create --topic daily-news-trigger --partitions 1 --replication-factor 1
kafka-topics --create --topic monitoring-events --partitions 3 --replication-factor 1
kafka-topics --create --topic agent-health --partitions 1 --replication-factor 1
```

**Tasks**:
- [ ] Create topic creation script
- [ ] Define Avro schemas for each topic
- [ ] Register schemas with Schema Registry
- [ ] Create topic visualization diagram

---

**Day 4-5: Database Setup**

**PostgreSQL Schema**:
```sql
-- Users table (existing from frontend)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(100),
  investment_goals TEXT,
  risk_tolerance VARCHAR(50),
  preferred_industry VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Portfolio table
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  quantity DECIMAL(20,8),
  avg_purchase_price DECIMAL(20,2),
  purchase_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Watchlist table (existing)
CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  company VARCHAR(255),
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Agent interactions table (for evaluation)
CREATE TABLE agent_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  query TEXT NOT NULL,
  intent VARCHAR(100),
  agent_type VARCHAR(100),
  response JSONB,
  latency_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent performance metrics
CREATE TABLE agent_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(100) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(20,4),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- News cache
CREATE TABLE news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20),
  headline TEXT,
  summary TEXT,
  source VARCHAR(100),
  url TEXT,
  published_at TIMESTAMP,
  sentiment VARCHAR(20),
  sentiment_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vector embeddings metadata
CREATE TABLE embeddings_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type VARCHAR(50), -- 'company_profile', 'market_analysis', 'news'
  document_id VARCHAR(255),
  symbol VARCHAR(20),
  vector_id VARCHAR(255), -- Qdrant point ID
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX idx_agent_interactions_user_id ON agent_interactions(user_id);
CREATE INDEX idx_agent_interactions_created_at ON agent_interactions(created_at);
CREATE INDEX idx_news_symbol ON news_articles(symbol);
CREATE INDEX idx_news_published_at ON news_articles(published_at);
```

**Tasks**:
- [ ] Create migration scripts
- [ ] Seed test data (5 test users with portfolios)
- [ ] Create database connection pools for each service

---

**Day 6-7: Orchestrator Agent (Node.js)**

**Structure**:
```
orchestrator-agent/
├── src/
│   ├── index.ts
│   ├── kafka/
│   │   ├── consumer.ts
│   │   ├── producer.ts
│   │   └── types.ts
│   ├── intent/
│   │   ├── classifier.ts      # Intent classification
│   │   └── router.ts          # Agent routing logic
│   ├── correlation/
│   │   └── manager.ts         # Track multi-agent requests
│   └── utils/
│       └── logger.ts
├── package.json
├── tsconfig.json
└── Dockerfile
```

**Core Functionality**:

```typescript
// Intent Classification
type Intent = 
  | 'portfolio_advice'
  | 'market_analysis' 
  | 'news_summary'
  | 'historical_analysis'
  | 'risk_assessment'
  | 'general_query';

class IntentClassifier {
  async classify(query: string): Promise<Intent> {
    // Use simple keyword matching first
    // Later: Use small LLM for classification
  }
}

// Agent Router
class AgentRouter {
  route(intent: Intent, correlationId: string, payload: any) {
    const topicMap = {
      'portfolio_advice': 'portfolio-tasks',
      'market_analysis': 'market-analysis-tasks',
      // ...
    };
    
    await this.kafkaProducer.send({
      topic: topicMap[intent],
      messages: [{
        key: correlationId,
        value: JSON.stringify(payload)
      }]
    });
  }
}

// Correlation Manager (for multi-agent queries)
class CorrelationManager {
  private pendingRequests = new Map();
  
  async waitForResponses(correlationId: string, expectedAgents: string[]) {
    // Wait for all agent responses with timeout
  }
}
```

**Tasks**:
- [ ] Set up Kafka consumer for `user-requests`
- [ ] Implement intent classifier (simple keyword-based)
- [ ] Implement agent router
- [ ] Set up Kafka producer to agent topics
- [ ] Add correlation tracking for multi-agent requests
- [ ] Add logging to `monitoring-events` topic
- [ ] Write unit tests
- [ ] Dockerize

**Test**:
```bash
# Send test message
kafka-console-producer --topic user-requests --bootstrap-server localhost:9092
> {"userId": "test-user", "query": "Should I buy more tech stocks?"}

# Verify orchestrator routes to portfolio-tasks
kafka-console-consumer --topic portfolio-tasks --from-beginning
```

---

## Phase 2: Core AI Agents (Week 2-3)

### 2.1 Portfolio Advisor Agent (Days 8-10)

**Structure**:
```
portfolio-agent/
├── src/
│   ├── main.py
│   ├── kafka_consumer.py
│   ├── kafka_producer.py
│   ├── portfolio_analyzer.py
│   ├── llm_client.py
│   ├── rag/
│   │   ├── retriever.py
│   │   └── embedder.py
│   └── models/
│       └── schemas.py
├── requirements.txt
├── Dockerfile
└── tests/
```

**Core Logic**:

```python
# portfolio_analyzer.py
class PortfolioAnalyzer:
    def __init__(self, llm_client, rag_retriever, db_client):
        self.llm = llm_client
        self.rag = rag_retriever
        self.db = db_client
    
    async def analyze_portfolio(self, user_id: str, query: str):
        # 1. Fetch user portfolio
        portfolio = await self.db.get_portfolio(user_id)
        
        # 2. Calculate current allocation
        allocation = self.calculate_allocation(portfolio)
        
        # 3. Retrieve relevant context from RAG
        context = await self.rag.retrieve(query, top_k=5)
        
        # 4. Call other agents if needed
        market_trends = await self.call_market_agent()
        risk_profile = await self.call_risk_agent(user_id)
        
        # 5. Generate recommendation with LLM
        prompt = self.build_prompt(portfolio, allocation, context, market_trends, risk_profile, query)
        recommendation = await self.llm.generate(prompt)
        
        return recommendation
    
    def build_prompt(self, portfolio, allocation, context, market_trends, risk_profile, query):
        return f"""
        You are a portfolio advisor. Analyze the following portfolio and answer the user's query.
        
        User Query: {query}
        
        Current Portfolio:
        {json.dumps(portfolio, indent=2)}
        
        Allocation:
        {json.dumps(allocation, indent=2)}
        
        User Risk Profile: {risk_profile}
        
        Market Context:
        {context}
        
        Current Market Trends:
        {market_trends}
        
        Provide a detailed recommendation with:
        1. Clear answer to the user's query
        2. Reasoning based on portfolio analysis
        3. Specific action items
        4. Risk considerations
        
        Format your response as JSON:
        {{
          "recommendation": "...",
          "reasoning": ["...", "..."],
          "suggested_actions": [...],
          "risk_metrics": {{...}}
        }}
        """
```

**RAG Setup**:
```python
# rag/embedder.py
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient

class EmbeddingRetriever:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.qdrant = QdrantClient(host="qdrant", port=6333)
        self.collection_name = "market_knowledge"
    
    async def embed(self, text: str):
        return self.model.encode(text)
    
    async def retrieve(self, query: str, top_k: int = 5):
        query_vector = await self.embed(query)
        results = self.qdrant.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=top_k
        )
        return [r.payload for r in results]
```

**Tasks**:
- [ ] Set up FastAPI service
- [ ] Implement Kafka consumer for `portfolio-tasks`
- [ ] Integrate OpenAI API or Claude API
- [ ] Implement RAG retriever
- [ ] Implement portfolio calculation logic
- [ ] Create prompt templates
- [ ] Add response validation
- [ ] Publish to `portfolio-responses`
- [ ] Add monitoring metrics
- [ ] Write tests
- [ ] Dockerize

**LLM Choice**:
- **Option 1**: OpenAI GPT-4-turbo (expensive, best quality)
- **Option 2**: Anthropic Claude 3.5 Sonnet (good quality, lower cost)
- **Option 3**: Open-source Llama 3.1 70B (free, requires GPU)

**Recommendation**: Start with GPT-3.5-turbo for cost, upgrade to GPT-4 if needed

---

### 2.2 Market Analysis Agent (Days 11-13)

**Key Features**:
- Real-time market data ingestion (Finnhub WebSocket)
- Technical indicator calculation
- Trend detection
- Sector analysis

**Flink Integration**:
```python
# flink_connector.py
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import StreamTableEnvironment

class MarketDataProcessor:
    def __init__(self):
        self.env = StreamExecutionEnvironment.get_execution_environment()
        self.t_env = StreamTableEnvironment.create(self.env)
    
    def setup_flink_job(self):
        # Create Kafka source
        self.t_env.execute_sql("""
            CREATE TABLE market_data (
                symbol STRING,
                price DOUBLE,
                volume BIGINT,
                timestamp BIGINT
            ) WITH (
                'connector' = 'kafka',
                'topic' = 'market-data-stream',
                'properties.bootstrap.servers' = 'kafka:9092',
                'format' = 'json'
            )
        """)
        
        # Calculate moving averages
        self.t_env.execute_sql("""
            CREATE TABLE moving_averages AS
            SELECT 
                symbol,
                AVG(price) OVER (
                    PARTITION BY symbol 
                    ORDER BY timestamp 
                    ROWS BETWEEN 49 PRECEDING AND CURRENT ROW
                ) as sma_50,
                AVG(price) OVER (
                    PARTITION BY symbol 
                    ORDER BY timestamp 
                    ROWS BETWEEN 199 PRECEDING AND CURRENT ROW
                ) as sma_200
            FROM market_data
        """)
```

**Tasks**:
- [ ] Set up FastAPI service
- [ ] Implement Kafka consumer
- [ ] Set up Finnhub API integration
- [ ] Implement Flink job for technical indicators
- [ ] Implement trend detection logic
- [ ] Create LLM prompt for trend interpretation
- [ ] Publish to `market-analysis-responses`
- [ ] Dockerize

---

### 2.3 News Intelligence Agent (Days 14-16)

**Key Features**:
- Multi-source news aggregation (Finnhub, Alpha Vantage, web scraping for MSE)
- Sentiment analysis
- Summarization
- Relevance scoring

**Implementation**:
```python
# news_aggregator.py
class NewsAggregator:
    def __init__(self, finnhub_client, alpha_vantage_client):
        self.finnhub = finnhub_client
        self.alpha_vantage = alpha_vantage_client
    
    async def fetch_news(self, symbols: List[str], hours: int = 24):
        news = []
        for symbol in symbols:
            # Fetch from Finnhub
            finnhub_news = await self.finnhub.get_company_news(symbol, hours)
            news.extend(finnhub_news)
        
        return self.deduplicate(news)
    
    async def analyze_sentiment(self, articles: List[Article]):
        # Use FinBERT or OpenAI for sentiment
        for article in articles:
            article.sentiment = await self.classify_sentiment(article.text)
        return articles
    
    async def summarize(self, articles: List[Article]):
        # Group by symbol
        grouped = self.group_by_symbol(articles)
        
        summaries = {}
        for symbol, symbol_articles in grouped.items():
            # Create prompt for LLM
            prompt = f"""
            Summarize the following news articles about {symbol}:
            
            {self.format_articles(symbol_articles)}
            
            Provide:
            1. Key takeaways (3-5 points)
            2. Overall sentiment (bullish/bearish/neutral)
            3. Potential impact on stock price
            """
            
            summary = await self.llm.generate(prompt)
            summaries[symbol] = summary
        
        return summaries
```

**Tasks**:
- [ ] Set up FastAPI service
- [ ] Implement news fetching from multiple sources
- [ ] Implement sentiment analysis (FinBERT or GPT)
- [ ] Implement summarization
- [ ] Handle daily news trigger from Kafka
- [ ] Store news in PostgreSQL cache
- [ ] Publish to `news-responses`
- [ ] Dockerize

---

## Phase 3: Advanced Agents (Week 3-4)

### 3.1 Historical Analysis Agent (Days 17-19)

**Key Features**:
- Historical data fetching (yfinance, Finnhub)
- Technical pattern detection
- Event correlation
- Long-term trend analysis

**Implementation**:
```python
# historical_analyzer.py
import yfinance as yf
import pandas as pd
import talib

class HistoricalAnalyzer:
    async def analyze(self, symbol: str, years: int = 5):
        # Fetch historical data
        df = yf.download(symbol, period=f"{years}y")
        
        # Calculate technical indicators
        df['SMA_50'] = talib.SMA(df['Close'], timeperiod=50)
        df['SMA_200'] = talib.SMA(df['Close'], timeperiod=200)
        df['RSI'] = talib.RSI(df['Close'], timeperiod=14)
        df['MACD'], df['MACD_signal'], _ = talib.MACD(df['Close'])
        
        # Detect patterns
        patterns = self.detect_patterns(df)
        
        # Identify key events
        events = await self.identify_events(symbol, df)
        
        # Generate narrative with LLM
        narrative = await self.generate_narrative(symbol, df, patterns, events)
        
        return {
            'symbol': symbol,
            'metrics': self.calculate_metrics(df),
            'patterns': patterns,
            'events': events,
            'narrative': narrative
        }
    
    def detect_patterns(self, df: pd.DataFrame):
        patterns = []
        
        # Cup and Handle
        if self.is_cup_and_handle(df):
            patterns.append({
                'pattern': 'Cup and Handle',
                'date': df.index[-1],
                'signal': 'bullish'
            })
        
        # Head and Shoulders
        # Double Top/Bottom
        # etc.
        
        return patterns
```

**Tasks**:
- [ ] Set up FastAPI service
- [ ] Integrate yfinance for historical data
- [ ] Implement technical indicator calculations (TA-Lib)
- [ ] Implement pattern detection
- [ ] Build event database (earnings, product launches)
- [ ] Create LLM narrative generation
- [ ] Publish to `historical-responses`
- [ ] Dockerize

---

### 3.2 Risk Assessment Agent (Days 20-22)

**Key Features**:
- Value at Risk (VaR) calculation
- Portfolio Beta and correlation
- Monte Carlo simulation
- Stress testing
- Risk-adjusted returns (Sharpe, Sortino)

**Implementation**:
```python
# risk_calculator.py
import numpy as np
import pandas as pd
from scipy import stats

class RiskCalculator:
    async def assess_risk(self, portfolio: List[Position], user_profile: UserProfile):
        # Get historical returns
        returns_df = await self.get_portfolio_returns(portfolio)
        
        # Calculate VaR
        var_95 = self.calculate_var(returns_df, confidence=0.95)
        var_99 = self.calculate_var(returns_df, confidence=0.99)
        
        # Calculate Beta
        portfolio_beta = await self.calculate_portfolio_beta(portfolio)
        
        # Correlation matrix
        correlation = returns_df.corr()
        
        # Monte Carlo simulation
        simulated_returns = self.monte_carlo_simulation(returns_df, days=252)
        
        # Stress scenarios
        stress_results = self.stress_test(portfolio)
        
        # Generate explanation with LLM
        explanation = await self.generate_explanation({
            'var_95': var_95,
            'portfolio_beta': portfolio_beta,
            'stress_results': stress_results,
            'user_risk_tolerance': user_profile.risk_tolerance
        })
        
        return {
            'risk_score': self.calculate_risk_score(var_95, portfolio_beta),
            'var_95': var_95,
            'var_99': var_99,
            'portfolio_beta': portfolio_beta,
            'correlation_matrix': correlation.to_dict(),
            'stress_scenarios': stress_results,
            'explanation': explanation,
            'recommendations': await self.generate_recommendations(...)
        }
    
    def calculate_var(self, returns: pd.Series, confidence: float = 0.95):
        return np.percentile(returns, (1 - confidence) * 100)
    
    def monte_carlo_simulation(self, returns: pd.DataFrame, days: int, simulations: int = 10000):
        mean_returns = returns.mean()
        cov_matrix = returns.cov()
        
        # Cholesky decomposition
        L = np.linalg.cholesky(cov_matrix)
        
        # Run simulations
        results = []
        for _ in range(simulations):
            random_returns = np.random.normal(size=(days, len(returns.columns)))
            correlated_returns = random_returns @ L.T
            cumulative = (1 + correlated_returns).cumprod(axis=0)
            results.append(cumulative[-1])
        
        return np.array(results)
```

**Tasks**:
- [ ] Set up FastAPI service
- [ ] Implement VaR calculation
- [ ] Implement Beta calculation
- [ ] Implement Monte Carlo simulation
- [ ] Implement stress testing scenarios
- [ ] Create risk scoring algorithm
- [ ] Generate LLM explanations
- [ ] Publish to `risk-responses`
- [ ] Dockerize

---

### 3.3 Flink Stream Processing Jobs (Days 23-24)

**Job 1: Real-time Technical Indicators**
```java
// FlinkTechnicalIndicators.java
public class TechnicalIndicatorsJob {
    public static void main(String[] args) throws Exception {
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Kafka source
        FlinkKafkaConsumer<MarketData> consumer = new FlinkKafkaConsumer<>(
            "market-data-stream",
            new MarketDataSchema(),
            properties
        );
        
        DataStream<MarketData> marketData = env.addSource(consumer);
        
        // Calculate SMA
        DataStream<TechnicalIndicator> sma50 = marketData
            .keyBy(MarketData::getSymbol)
            .window(SlidingEventTimeWindows.of(Time.minutes(50), Time.minutes(1)))
            .aggregate(new SMACalculator(50));
        
        // Sink to Kafka
        FlinkKafkaProducer<TechnicalIndicator> producer = new FlinkKafkaProducer<>(
            "technical-indicators",
            new TechnicalIndicatorSchema(),
            properties
        );
        
        sma50.addSink(producer);
        
        env.execute("Technical Indicators Job");
    }
}
```

**Job 2: Market Trend Detection**
```python
# flink_trend_detection.py (PyFlink)
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import StreamTableEnvironment

def detect_trends():
    env = StreamExecutionEnvironment.get_execution_environment()
    t_env = StreamTableEnvironment.create(env)
    
    # Define source
    t_env.execute_sql("""
        CREATE TABLE market_prices (
            symbol STRING,
            price DOUBLE,
            volume BIGINT,
            event_time TIMESTAMP(3),
            WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
        ) WITH (
            'connector' = 'kafka',
            'topic' = 'market-data-stream',
            'properties.bootstrap.servers' = 'kafka:9092',
            'format' = 'json'
        )
    """)
    
    # Detect golden cross (SMA 50 crosses above SMA 200)
    t_env.execute_sql("""
        CREATE TABLE trend_signals AS
        SELECT
            symbol,
            CASE
                WHEN sma_50 > sma_200 AND LAG(sma_50) < LAG(sma_200) THEN 'GOLDEN_CROSS'
                WHEN sma_50 < sma_200 AND LAG(sma_50) > LAG(sma_200) THEN 'DEATH_CROSS'
                ELSE 'NEUTRAL'
            END as signal,
            event_time
        FROM (
            SELECT
                symbol,
                AVG(price) OVER w50 as sma_50,
                AVG(price) OVER w200 as sma_200,
                event_time
            FROM market_prices
            WINDOW w50 AS (
                PARTITION BY symbol
                ORDER BY event_time
                ROWS BETWEEN 49 PRECEDING AND CURRENT ROW
            ),
            WINDOW w200 AS (
                PARTITION BY symbol
                ORDER BY event_time
                ROWS BETWEEN 199 PRECEDING AND CURRENT ROW
            )
        )
    """)
    
    # Sink to Kafka
    t_env.execute_sql("""
        CREATE TABLE trend_signals_sink (
            symbol STRING,
            signal STRING,
            event_time TIMESTAMP(3)
        ) WITH (
            'connector' = 'kafka',
            'topic' = 'trend-signals',
            'properties.bootstrap.servers' = 'kafka:9092',
            'format' = 'json'
        )
    """)
    
    t_env.execute_sql("INSERT INTO trend_signals_sink SELECT * FROM trend_signals")
```

**Tasks**:
- [ ] Set up Flink cluster (Docker)
- [ ] Implement technical indicators job
- [ ] Implement trend detection job
- [ ] Create Kafka-Flink connectors
- [ ] Test with sample data
- [ ] Monitor job performance

---

## Phase 4: Frontend Integration (Week 4-5)

### 4.1 Migrate from Inngest to Kafka (Days 25-27)

**Current Inngest Functions**:
1. `sendWelcomeEmail` - User onboarding
2. `sendDailyNews` - Daily news digest

**Migration Strategy**:

**Before (Inngest)**:
```typescript
// app/api/inngest/functions.ts
export const sendWelcomeEmail = inngest.createFunction(
  { id: "send-welcome-email" },
  { event: "user/signup" },
  async ({ event, step }) => {
    // Generate intro
    // Send email
  }
);
```

**After (Kafka)**:
```typescript
// lib/kafka/producer.ts
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'nextjs-frontend',
  brokers: [process.env.KAFKA_BROKER!]
});

const producer = kafka.producer();

export async function publishUserSignup(user: User) {
  await producer.send({
    topic: 'user-requests',
    messages: [{
      key: user.id,
      value: JSON.stringify({
        messageId: generateId(),
        userId: user.id,
        eventType: 'user_signup',
        timestamp: new Date().toISOString(),
        payload: {
          email: user.email,
          name: user.name,
          preferences: {
            investmentGoals: user.investmentGoals,
            riskTolerance: user.riskTolerance,
            preferredIndustry: user.preferredIndustry
          }
        }
      })
    }]
  });
}

// lib/kafka/consumer.ts (Next.js API route)
export async function GET(req: Request) {
  const { userId } = await req.json();
  
  // Long polling for response
  const consumer = kafka.consumer({ groupId: `frontend-${userId}` });
  await consumer.subscribe({ topic: 'user-responses', fromBeginning: false });
  
  return new Promise((resolve) => {
    consumer.run({
      eachMessage: async ({ message }) => {
        const response = JSON.parse(message.value.toString());
        if (response.userId === userId) {
          resolve(Response.json(response));
          await consumer.disconnect();
        }
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => resolve(Response.json({ error: 'Timeout' })), 30000);
  });
}
```

**Tasks**:
- [ ] Install `kafkajs` package
- [ ] Create Kafka producer utility
- [ ] Create Kafka consumer utility (for responses)
- [ ] Replace Inngest calls in sign-up flow
- [ ] Replace Inngest cron for daily news
- [ ] Add error handling and retries
- [ ] Test end-to-end

---

### 4.2 Real-time Agent Responses (Days 28-29)

**Options**:
1. **Server-Sent Events (SSE)** - Simpler, one-way
2. **WebSocket** - Bidirectional, more complex

**Recommendation**: Use SSE for simplicity

**Implementation**:
```typescript
// app/api/agents/stream/route.ts
import { Kafka } from 'kafkajs';

export async function POST(req: Request) {
  const { query, userId } = await req.json();
  
  // Generate correlation ID
  const correlationId = generateId();
  
  // Publish to Kafka
  await kafkaProducer.send({
    topic: 'user-requests',
    messages: [{
      value: JSON.stringify({
        correlationId,
        userId,
        query,
        timestamp: new Date().toISOString()
      })
    }]
  });
  
  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const consumer = kafka.consumer({ groupId: `sse-${correlationId}` });
      await consumer.subscribe({ topic: 'user-responses' });
      
      await consumer.run({
        eachMessage: async ({ message }) => {
          const response = JSON.parse(message.value.toString());
          if (response.correlationId === correlationId) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(response)}\n\n`));
            
            if (response.status === 'complete') {
              controller.close();
              await consumer.disconnect();
            }
          }
        }
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

**Frontend Client**:
```typescript
// components/agent-chat.tsx
'use client';

export function AgentChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  async function sendQuery(query: string) {
    setIsLoading(true);
    
    const response = await fetch('/api/agents/stream', {
      method: 'POST',
      body: JSON.stringify({ query, userId: session.user.id })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          if (data.status === 'thinking') {
            setMessages(m => [...m, { role: 'agent', content: '🤔 Thinking...' }]);
          } else if (data.status === 'partial') {
            // Streaming response
            setMessages(m => {
              const last = m[m.length - 1];
              if (last.role === 'agent') {
                return [...m.slice(0, -1), { ...last, content: data.content }];
              }
              return [...m, { role: 'agent', content: data.content }];
            });
          } else if (data.status === 'complete') {
            setIsLoading(false);
            setMessages(m => [...m, { role: 'agent', content: data.content }]);
          }
        }
      }
    }
  }
  
  return (
    <div className="chat-container">
      {messages.map((msg, i) => (
        <MessageBubble key={i} role={msg.role} content={msg.content} />
      ))}
      <ChatInput onSend={sendQuery} disabled={isLoading} />
    </div>
  );
}
```

**Tasks**:
- [ ] Implement SSE endpoint
- [ ] Create React component for agent chat
- [ ] Add loading states and animations
- [ ] Handle errors gracefully
- [ ] Test with different query types

---

### 4.3 New UI Components (Days 30-32)

**New Pages**:

1. **Portfolio Advisor Page** (`/portfolio-advisor`)
   - Chat interface
   - Current portfolio overview
   - Recommendations display
   - Action buttons (buy, sell, rebalance)

2. **Market Trends Dashboard** (`/market-trends`)
   - Sector heatmap
   - Trend indicators (bullish/bearish)
   - Top movers
   - AI insights panel

3. **Historical Analysis** (`/analysis/[symbol]`)
   - Interactive chart with indicators
   - Pattern highlights
   - Event timeline
   - AI narrative

4. **Risk Dashboard** (`/portfolio/risk`)
   - Risk score gauge
   - VaR visualization
   - Correlation matrix
   - Stress test results
   - Mitigation suggestions

**Component Library**:
```
frontend/components/
├── agents/
│   ├── agent-chat.tsx
│   ├── agent-response.tsx
│   ├── thinking-indicator.tsx
│   └── citation.tsx
├── portfolio/
│   ├── portfolio-overview.tsx
│   ├── allocation-chart.tsx
│   └── rebalance-suggestions.tsx
├── market/
│   ├── sector-heatmap.tsx
│   ├── trend-indicators.tsx
│   └── top-movers.tsx
├── analysis/
│   ├── stock-chart.tsx
│   ├── technical-indicators.tsx
│   └── event-timeline.tsx
└── risk/
    ├── risk-gauge.tsx
    ├── correlation-matrix.tsx
    └── stress-test-results.tsx
```

**Tasks**:
- [ ] Design UI mockups (Figma)
- [ ] Implement Portfolio Advisor page
- [ ] Implement Market Trends dashboard
- [ ] Implement Historical Analysis page
- [ ] Implement Risk Dashboard
- [ ] Add chart library (Recharts or TradingView)
- [ ] Responsive design
- [ ] Dark mode support

---

## Phase 5: Evaluation & Testing (Week 5-6)

### 5.1 Agent Performance Evaluation (Days 33-35)

**Metrics to Collect**:

1. **Response Accuracy**
   - Compare agent recommendations with expert analysis
   - Measure factual correctness
   - Track hallucination rate

2. **Latency**
   - End-to-end response time
   - Per-agent processing time
   - Kafka message latency

3. **Cost**
   - Tokens used per query
   - Cost per query (USD)
   - Monthly projected cost

4. **User Satisfaction**
   - Rating system (1-5 stars)
   - Collect feedback on responses

**Evaluation Script**:
```python
# evaluation/agent_evaluator.py
import json
import time
from kafka import KafkaProducer, KafkaConsumer

class AgentEvaluator:
    def __init__(self):
        self.producer = KafkaProducer(bootstrap_servers='localhost:9092')
        self.consumer = KafkaConsumer('user-responses', bootstrap_servers='localhost:9092')
        self.results = []
    
    def evaluate_query(self, query, expected_intent, ground_truth=None):
        correlation_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Send query
        self.producer.send('user-requests', json.dumps({
            'correlationId': correlation_id,
            'userId': 'test-user',
            'query': query
        }).encode())
        
        # Wait for response
        for message in self.consumer:
            response = json.loads(message.value)
            if response['correlationId'] == correlation_id:
                latency = time.time() - start_time
                
                # Evaluate
                result = {
                    'query': query,
                    'latency_seconds': latency,
                    'intent_correct': response.get('intent') == expected_intent,
                    'response': response,
                    'tokens_used': response.get('metadata', {}).get('tokensUsed'),
                    'cost_usd': response.get('metadata', {}).get('costUsd')
                }
                
                # Check factual accuracy if ground truth provided
                if ground_truth:
                    result['accuracy'] = self.check_accuracy(response, ground_truth)
                
                self.results.append(result)
                break
        
        return result
    
    def run_evaluation_suite(self):
        test_cases = [
            {
                'query': 'Should I buy more tech stocks?',
                'expected_intent': 'portfolio_advice',
                'ground_truth': 'Recommend diversification if tech > 50%'
            },
            {
                'query': 'What are the current market trends?',
                'expected_intent': 'market_analysis'
            },
            # ... more test cases
        ]
        
        for test_case in test_cases:
            self.evaluate_query(**test_case)
        
        # Generate report
        self.generate_report()
    
    def generate_report(self):
        avg_latency = sum(r['latency_seconds'] for r in self.results) / len(self.results)
        avg_cost = sum(r.get('cost_usd', 0) for r in self.results) / len(self.results)
        intent_accuracy = sum(r['intent_correct'] for r in self.results) / len(self.results)
        
        print(f"Average Latency: {avg_latency:.2f}s")
        print(f"Average Cost: ${avg_cost:.4f}")
        print(f"Intent Accuracy: {intent_accuracy * 100:.1f}%")
        
        # Save detailed results
        with open('evaluation_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)

if __name__ == '__main__':
    evaluator = AgentEvaluator()
    evaluator.run_evaluation_suite()
```

**Tasks**:
- [ ] Create evaluation script
- [ ] Define 50+ test cases covering all agents
- [ ] Run evaluation suite
- [ ] Collect metrics
- [ ] Generate visualizations (charts, tables)
- [ ] Document results for thesis

---

### 5.2 System Performance Testing (Days 36-37)

**Load Testing**:
```python
# load_test/locustfile.py
from locust import HttpUser, task, between

class StockAnalysisUser(HttpUser):
    wait_time = between(1, 5)
    
    @task(3)
    def portfolio_advice(self):
        self.client.post('/api/agents/query', json={
            'query': 'Should I rebalance my portfolio?',
            'userId': self.user_id
        })
    
    @task(2)
    def market_trends(self):
        self.client.post('/api/agents/query', json={
            'query': 'What are the current market trends?',
            'userId': self.user_id
        })
    
    @task(1)
    def historical_analysis(self):
        self.client.post('/api/agents/query', json={
            'query': 'Analyze AAPL over the last 5 years',
            'userId': self.user_id
        })
    
    def on_start(self):
        self.user_id = f"test-user-{self.environment.runner.user_count}"
```

**Run Load Test**:
```bash
# 100 concurrent users, spawn rate 10/second
locust -f load_test/locustfile.py --host=http://localhost:3000 --users 100 --spawn-rate 10

# Monitor Kafka lag
kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group portfolio-agent-group
```

**Tasks**:
- [ ] Set up Locust for load testing
- [ ] Test with 10, 50, 100, 200 concurrent users
- [ ] Monitor CPU, memory, disk I/O
- [ ] Monitor Kafka lag
- [ ] Identify bottlenecks
- [ ] Document performance characteristics

---

### 5.3 Comparison with Monolith (Days 38-39)

**Build Simple Monolith Version** (for comparison):
```
monolith/
├── app.py  # Single Flask app with all agent logic
└── requirements.txt
```

**Comparison Metrics**:
| Metric | Monolith (Inngest) | Event-Driven Microservices |
|--------|-------------------|----------------------------|
| Deployment Flexibility | ❌ Deploy all together | ✅ Independent deployment |
| Horizontal Scalability | ❌ Scale entire app | ✅ Scale individual agents |
| Latency (p50) | ? ms | ? ms |
| Latency (p99) | ? ms | ? ms |
| Fault Isolation | ❌ One agent fails → all fail | ✅ Isolated failures |
| Agent Independence | ❌ Tight coupling | ✅ Loose coupling |
| Development Velocity | ✅ Faster initially | ⚠️ Slower initially, faster long-term |
| Operational Complexity | ✅ Simple | ❌ Complex |
| Cost (at 1000 RPH) | ? | ? |
| Cost (at 10000 RPH) | ? | ? |

**Tasks**:
- [ ] Implement simple monolith version
- [ ] Run same load tests on both
- [ ] Compare metrics
- [ ] Document trade-offs
- [ ] Create comparison charts for thesis

---

### 5.4 Thesis Report Updates (Days 40-42)

**Add Evaluation Chapter**:

**Хэрэгжүүлэлт ба үр дүн** (New Chapter):

1. **Системийн хэрэгжүүлэлт**
   - Архитектурын дэлгэрэнгүй
   - Технологийн сонголт
   - Агентуудын тодорхойлолт

2. **Туршилтын орчин**
   - Техник хангамж
   - Өгөгдлийн багц
   - Тестийн хувилбарууд

3. **Үр дүнгийн үнэлгээ**
   - Агентын гүйцэтгэл
   - Системийн гүйцэтгэл
   - Монолиттой харьцуулалт
   - RAG системийн үр дүн

4. **Дүн шинжилгээ**
   - Давуу тал
   - Сул тал
   - Практик зөвлөмж

**Include**:
- Performance charts
- Architecture diagrams
- Code snippets (in appendix)
- Screenshots of demo
- Comparison tables

**Tasks**:
- [ ] Write implementation chapter
- [ ] Add evaluation chapter
- [ ] Include charts and diagrams
- [ ] Proofread and format
- [ ] Submit for advisor review

---

## Demo Preparation (Week 6)

### Day 43-44: Demo Environment Setup

**Infrastructure**:
- [ ] Cloud VM or local setup
- [ ] Ensure all services running
- [ ] Load sample data
- [ ] Test all demo scenarios

**Demo Script**:
1. **Introduction** (2 min)
   - Problem statement
   - Proposed solution

2. **Architecture Overview** (3 min)
   - Show diagram
   - Explain event-driven approach
   - Show Kafka UI with topics

3. **Demo Scenario 1: Portfolio Advisor** (5 min)
   - User query: "Should I rebalance my portfolio?"
   - Show Kafka messages flowing
   - Show multi-agent collaboration
   - Display final recommendation

4. **Demo Scenario 2: Market Trends** (3 min)
   - Query: "What are the current market trends?"
   - Show Flink processing
   - Display trend analysis

5. **Demo Scenario 3: System Resilience** (3 min)
   - Kill an agent container
   - Show system continues working
   - Restart agent, show recovery

6. **Evaluation Results** (4 min)
   - Show performance metrics
   - Comparison with monolith
   - Cost analysis

7. **Q&A** (5 min)

**Total Time**: 25 minutes

---

### Day 45-46: Backup Plans & Final Testing

**Backup Plans**:
1. **If Kafka fails**: Have pre-recorded video
2. **If LLM API fails**: Use cached responses
3. **If network fails**: Local setup with mock data

**Final Checklist**:
- [ ] All services start successfully
- [ ] All demo scenarios tested
- [ ] Backup video recorded
- [ ] Presentation slides ready
- [ ] Thesis report printed
- [ ] Code repository clean and documented

---

## Tech Stack Summary

### Backend
- **Orchestrator**: Node.js + TypeScript + KafkaJS
- **Agents**: Python + FastAPI + aiokafka
- **Stream Processing**: Apache Flink (Python API)
- **LLM**: OpenAI GPT-3.5/GPT-4 or Anthropic Claude
- **Vector DB**: Qdrant
- **Primary DB**: PostgreSQL
- **Cache**: Redis
- **Message Broker**: Apache Kafka

### Frontend
- **Framework**: Next.js 14 (existing)
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts or TradingView Lightweight Charts
- **State**: React Context / Zustand
- **API Client**: KafkaJS (producer) + Fetch API

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Docker Compose (demo) → Kubernetes (production)
- **Monitoring**: Kafka UI, Prometheus, Grafana (optional)

### APIs
- **Stock Data**: Finnhub, yfinance, Alpha Vantage
- **MSE Data**: Web scraping or manual CSV

---

## Estimated Costs

### Development
- **LLM API** (OpenAI): $50-100 for testing
- **Cloud VM** (if needed): $20-50/month
- **Confluent Cloud** (optional): Free tier or $0

**Total**: ~$100-150

### Demo
- **LLM API**: $5-10
- **Infrastructure**: $0 (local Docker)

**Total**: ~$10

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| LLM costs exceed budget | Medium | Medium | Use GPT-3.5, add caching, limit test queries |
| Kafka setup too complex | Medium | High | Use Confluent Cloud free tier or docker-compose template |
| Agents not accurate enough | Medium | High | Improve prompts, add RAG, use better models |
| Time runs out | High | Critical | Prioritize core agents, skip advanced features if needed |
| Demo fails during defense | Low | High | Record backup video, test thoroughly |

---

## Success Metrics

### Minimum Viable Demo (Must Have)
- [ ] 3 agents working (Orchestrator, Portfolio, News)
- [ ] Kafka message flow visible
- [ ] 2 demo scenarios working
- [ ] Basic evaluation metrics
- [ ] Thesis report complete

### Target Demo (Should Have)
- [ ] 5+ agents working
- [ ] Flink integration
- [ ] Complete evaluation
- [ ] Comparison with monolith
- [ ] Polished UI

### Stretch Goals (Nice to Have)
- [ ] MSE data integration
- [ ] Advanced visualizations
- [ ] Real-time streaming
- [ ] Kubernetes deployment

---

## Weekly Milestones

- **Week 1**: Infrastructure running, Orchestrator working
- **Week 2**: 3 core agents working
- **Week 3**: Advanced agents + Flink
- **Week 4**: Frontend integration
- **Week 5**: Evaluation complete
- **Week 6**: Demo ready, thesis finalized

---

## Next Steps

1. ✅ Review and approve VISION.md
2. ✅ Review and approve PLAN.md
3. ⬜ Set up development environment
4. ⬜ Begin Phase 1: Docker infrastructure
5. ⬜ Create project board with tasks

---

## Questions to Resolve

1. **LLM Provider**: OpenAI vs Anthropic vs Open-source?
   - **Recommendation**: Start with OpenAI GPT-3.5-turbo for cost, evaluate if GPT-4 needed

2. **Kafka Deployment**: Docker vs Cloud?
   - **Recommendation**: Docker Compose for simplicity, can demo locally

3. **Flink**: Java or Python API?
   - **Recommendation**: Python (PyFlink) for consistency with agents

4. **MSE Data**: Build scraper or use CSV?
   - **Recommendation**: Start with CSV, add scraper if time permits

5. **Frontend**: Migrate fully or keep hybrid?
   - **Recommendation**: Hybrid approach - migrate key features, keep some Inngest for comparison

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-07  
**Status**: Ready for Implementation  
**Estimated Completion**: 6 weeks  

**Author**: Б.Раднаабазар  
**Thesis Advisor**: Дэд профессор Б.Сувдаа

