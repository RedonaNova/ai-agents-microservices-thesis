# REVISED Implementation Plan - Event-Driven AI Agents

**Based on**: 
- User preferences (Gemini API, Node.js, MSE data available)
- "AI Agents are Microservices with Brains" architecture
- "Building Real Enterprise AI Agents with Apache Flink" patterns

---

## Architecture Overview (Revised)

Following the articles' pattern:

```
User Request → Kafka (user-requests)
              ↓
         Flink Decision Layer (with Gemini LLM)
              ↓
    Kafka Topics (agent-specific tasks)
              ↓
    Specialized Agent Microservices (Node.js)
              ↓
    Kafka Topics (responses + state updates)
              ↓
    Flink Aggregation & Response Builder
              ↓
         User Response
```

### Key Concept: "Streaming Agents"

Instead of traditional orchestrator, we use **Flink as the intelligent routing layer**:
- Flink consumes events from Kafka
- Uses Gemini LLM to understand context and make routing decisions
- Maintains stateful computation (agent memory, user context)
- Routes tasks to specialized agents
- Aggregates responses in real-time

This is exactly what the articles describe!

---

## Tech Stack (Updated)

### Backend
- **All Agents**: Node.js + TypeScript (your preference!)
- **LLM**: Google Gemini 1.5 Pro/Flash
- **Orchestration**: Apache Flink (Python/Java Flink jobs)
- **Message Broker**: Apache Kafka
- **Vector DB**: Qdrant (for RAG)
- **Database**: PostgreSQL (stores user data, agent state, MSE data)
- **Cache**: Redis

### Why Node.js for Agents?
- ✅ You're comfortable with it
- ✅ Same stack as Next.js frontend
- ✅ Excellent Kafka libraries (KafkaJS)
- ✅ Fast async I/O
- ✅ Easy to deploy
- ⚠️ Python only for heavy ML tasks (if needed)

### Why Gemini API?
- ✅ **Much cheaper**: $0.00025/1K input tokens vs OpenAI $0.001
- ✅ **Large context**: 2M tokens (perfect for RAG)
- ✅ **Fast**: Gemini 1.5 Flash is very fast
- ✅ **Good quality**: Comparable to GPT-3.5-turbo
- ✅ **Free tier**: 15 requests/minute free!

**Cost comparison** (1000 requests, 1000 tokens each):
- OpenAI GPT-3.5: $1.00
- Gemini 1.5 Flash: $0.25
- **Savings: 75%!**

---

## System Architecture (Following Articles)

### Core Components

#### 1. Apache Kafka (Event Backbone)
The "central nervous system" - all communication flows through Kafka topics.

**Topics**:
```
# User interaction
user-requests          # User queries
user-responses         # Final responses

# Flink orchestration
agent-routing-events   # Flink decision events
agent-state-updates    # Stateful updates

# Agent-specific
portfolio-tasks
portfolio-responses
market-analysis-tasks
market-analysis-responses
news-tasks
news-responses
risk-tasks
risk-responses

# MSE data streaming
mse-stock-updates      # Real-time MSE data
mse-news-events        # MSE news

# System
monitoring-events
agent-health
```

#### 2. Apache Flink (Decision Layer)

**Flink Job 1: Intelligent Router**
```python
# flink-jobs/intelligent_router.py
from pyflink.datastream import StreamExecutionEnvironment
import google.generativeai as genai

class IntelligentRouter:
    def __init__(self):
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    def route_request(self, user_request):
        """Use Gemini to understand intent and route to appropriate agent"""
        prompt = f"""
        Analyze this user request and determine which agent(s) should handle it:
        
        Request: {user_request['query']}
        User Context: {user_request['context']}
        
        Available agents:
        - portfolio: portfolio analysis and recommendations
        - market: market trend analysis
        - news: news intelligence and sentiment
        - risk: risk assessment
        - historical: historical data analysis
        
        Respond with JSON:
        {{
          "primary_agent": "agent_name",
          "secondary_agents": ["agent1", "agent2"],
          "reasoning": "why this routing",
          "requires_collaboration": true/false
        }}
        """
        
        response = self.model.generate_content(prompt)
        routing_decision = json.loads(response.text)
        
        return routing_decision

def main():
    env = StreamExecutionEnvironment.get_execution_environment()
    
    # Source: Kafka user-requests
    user_requests = env.add_source(
        FlinkKafkaConsumer('user-requests', ...)
    )
    
    # Process: Intelligent routing with Gemini
    routing_decisions = user_requests.map(
        lambda req: IntelligentRouter().route_request(req)
    )
    
    # Sink: Kafka agent-specific topics
    routing_decisions.add_sink(
        FlinkKafkaProducer(...)
    )
    
    env.execute("Intelligent Router")
```

**Flink Job 2: Stateful Agent Memory**
```python
# Maintains agent state using Flink's state management
class AgentMemory:
    def __init__(self):
        self.user_context = {}  # Flink managed state
        self.conversation_history = {}
    
    def update_context(self, user_id, new_info):
        """Update stateful context"""
        if user_id not in self.user_context:
            self.user_context[user_id] = {}
        
        self.user_context[user_id].update(new_info)
        
    def get_context(self, user_id):
        """Retrieve stateful context"""
        return self.user_context.get(user_id, {})
```

**Flink Job 3: MSE Real-Time Analytics**
```python
# Process MSE stock updates in real-time
from pyflink.table import StreamTableEnvironment

def mse_analytics_job():
    t_env = StreamTableEnvironment.create(env)
    
    # Define MSE stock stream
    t_env.execute_sql("""
        CREATE TABLE mse_stocks (
            symbol STRING,
            price DOUBLE,
            volume BIGINT,
            timestamp BIGINT,
            WATERMARK FOR timestamp AS timestamp - INTERVAL '5' SECOND
        ) WITH (
            'connector' = 'kafka',
            'topic' = 'mse-stock-updates',
            'properties.bootstrap.servers' = 'kafka:9092',
            'format' = 'json'
        )
    """)
    
    # Calculate moving averages
    t_env.execute_sql("""
        CREATE VIEW mse_indicators AS
        SELECT
            symbol,
            AVG(price) OVER (
                PARTITION BY symbol
                ORDER BY timestamp
                ROWS BETWEEN 49 PRECEDING AND CURRENT ROW
            ) as sma_50,
            price,
            timestamp
        FROM mse_stocks
    """)
    
    # Detect significant movements
    t_env.execute_sql("""
        INSERT INTO kafka_alerts
        SELECT symbol, price, sma_50, 'BREAKOUT' as signal
        FROM mse_indicators
        WHERE price > sma_50 * 1.05  -- 5% above SMA
    """)
```

#### 3. Agent Microservices (Node.js)

**All agents follow the same pattern**:
```typescript
// base-agent/index.ts
import { Kafka } from 'kafkajs';
import { GoogleGenerativeAI } from '@google/generative-ai';

export abstract class BaseAgent {
  protected kafka: Kafka;
  protected consumer: Consumer;
  protected producer: Producer;
  protected genai: GoogleGenerativeAI;
  protected model: GenerativeModel;
  
  constructor(
    protected agentName: string,
    protected inputTopic: string,
    protected outputTopic: string
  ) {
    this.kafka = new Kafka({
      clientId: agentName,
      brokers: [process.env.KAFKA_BROKER!]
    });
    
    this.genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = this.genai.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  
  async start() {
    await this.consumer.subscribe({ topic: this.inputTopic });
    
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const task = JSON.parse(message.value.toString());
        
        try {
          const result = await this.process(task);
          
          await this.producer.send({
            topic: this.outputTopic,
            messages: [{
              key: task.correlationId,
              value: JSON.stringify({
                ...result,
                agentName: this.agentName,
                timestamp: Date.now()
              })
            }]
          });
        } catch (error) {
          await this.handleError(task, error);
        }
      }
    });
  }
  
  abstract async process(task: any): Promise<any>;
  
  protected async callGemini(prompt: string): Promise<string> {
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}
```

---

## Project Structure (Revised)

```
thesis-report/
├── backend/
│   ├── docker-compose.yml
│   ├── .env.example
│   │
│   ├── flink-jobs/                    # Apache Flink (Python)
│   │   ├── intelligent_router.py      # Main orchestrator
│   │   ├── agent_memory.py            # Stateful context
│   │   ├── mse_analytics.py           # MSE stream processing
│   │   ├── response_aggregator.py     # Aggregate multi-agent responses
│   │   └── requirements.txt
│   │
│   ├── shared/                        # Shared utilities (Node.js)
│   │   ├── base-agent.ts              # Base agent class
│   │   ├── kafka-client.ts            # Kafka utilities
│   │   ├── gemini-client.ts           # Gemini utilities
│   │   ├── rag-retriever.ts           # RAG system
│   │   └── database.ts                # PostgreSQL client
│   │
│   ├── portfolio-agent/               # Node.js
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── analyzer.ts
│   │   │   └── prompts.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── market-analysis-agent/         # Node.js
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── trend-detector.ts
│   │   │   └── sector-analyzer.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── news-agent/                    # Node.js
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── news-fetcher.ts
│   │   │   ├── sentiment-analyzer.ts
│   │   │   └── summarizer.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── historical-agent/              # Node.js
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── pattern-detector.ts
│   │   │   └── event-correlator.ts
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── risk-agent/                    # Node.js + Python helpers
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── var-calculator.ts
│   │   │   └── monte-carlo.py         # Python for heavy math
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── mse-ingestion-service/         # Node.js
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── csv-parser.ts
│   │   │   └── kafka-producer.ts
│   │   └── package.json
│   │
│   └── rag-service/                   # Node.js
│       ├── src/
│       │   ├── index.ts
│       │   ├── embedder.ts            # Use Gemini embeddings
│       │   ├── retriever.ts
│       │   └── qdrant-client.ts
│       └── package.json
│
├── frontend/                          # Next.js (existing)
│   ├── lib/
│   │   └── kafka-producer.ts         # Publish to Kafka
│   └── app/
│       └── api/
│           └── agents/
│               └── stream/
│                   └── route.ts      # SSE endpoint
│
└── infrastructure/
    ├── kafka/
    │   └── create-topics.sh
    ├── postgres/
    │   ├── schema.sql
    │   └── seed-mse-data.sql
    └── qdrant/
        └── init-collections.py
```

---

## Implementation Plan (6 Weeks - REVISED)

### Phase 1: Infrastructure (Week 1)

#### Day 1-2: Docker Setup

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  # Apache Kafka
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
      - "9093:9093"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9093,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  # Kafka UI (for visualization)
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    depends_on:
      - kafka
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9093

  # Apache Flink
  flink-jobmanager:
    image: apache/flink:1.18-scala_2.12-java11
    ports:
      - "8081:8081"
    command: jobmanager
    environment:
      - |
        FLINK_PROPERTIES=
        jobmanager.rpc.address: flink-jobmanager
        parallelism.default: 2

  flink-taskmanager:
    image: apache/flink:1.18-scala_2.12-java11
    depends_on:
      - flink-jobmanager
    command: taskmanager
    environment:
      - |
        FLINK_PROPERTIES=
        jobmanager.rpc.address: flink-jobmanager
        taskmanager.numberOfTaskSlots: 2
        parallelism.default: 2

  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: thesis_db
      POSTGRES_USER: thesis_user
      POSTGRES_PASSWORD: thesis_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infrastructure/postgres:/docker-entrypoint-initdb.d

  # Qdrant Vector DB
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  qdrant_data:
```

**Tasks**:
- [ ] Create `backend/docker-compose.yml`
- [ ] Create `.env.example` with GEMINI_API_KEY
- [ ] Run `docker-compose up -d`
- [ ] Verify all services healthy
- [ ] Access Kafka UI at http://localhost:8080
- [ ] Access Flink UI at http://localhost:8081

---

#### Day 3: Kafka Topics & Database Schema

**Create topics script**:
```bash
#!/bin/bash
# infrastructure/kafka/create-topics.sh

KAFKA_BROKER="localhost:9092"

topics=(
  "user-requests:3:1"
  "user-responses:3:1"
  "agent-routing-events:3:1"
  "portfolio-tasks:2:1"
  "portfolio-responses:2:1"
  "market-analysis-tasks:2:1"
  "market-analysis-responses:2:1"
  "news-tasks:2:1"
  "news-responses:2:1"
  "risk-tasks:2:1"
  "risk-responses:2:1"
  "mse-stock-updates:3:1"
  "mse-news-events:2:1"
  "monitoring-events:1:1"
)

for topic_config in "${topics[@]}"; do
  IFS=':' read -r topic partitions replication <<< "$topic_config"
  
  kafka-topics --create \
    --bootstrap-server $KAFKA_BROKER \
    --topic $topic \
    --partitions $partitions \
    --replication-factor $replication \
    --if-not-exists
  
  echo "✓ Created topic: $topic"
done

echo "All topics created!"
```

**Database schema**:
```sql
-- infrastructure/postgres/schema.sql

-- Users table
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

-- MSE stocks table (your data!)
CREATE TABLE mse_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  sector VARCHAR(100),
  listed_shares BIGINT,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- MSE price history
CREATE TABLE mse_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) REFERENCES mse_stocks(symbol),
  date DATE NOT NULL,
  open_price DECIMAL(20,2),
  high_price DECIMAL(20,2),
  low_price DECIMAL(20,2),
  close_price DECIMAL(20,2),
  volume BIGINT,
  UNIQUE(symbol, date)
);

CREATE INDEX idx_mse_price_symbol_date ON mse_price_history(symbol, date DESC);

-- Portfolio table
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  quantity DECIMAL(20,8),
  avg_purchase_price DECIMAL(20,2),
  purchase_date TIMESTAMP,
  market VARCHAR(20) DEFAULT 'US',  -- 'US' or 'MSE'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent interactions (for evaluation)
CREATE TABLE agent_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  query TEXT NOT NULL,
  intent VARCHAR(100),
  primary_agent VARCHAR(100),
  secondary_agents TEXT[],
  response JSONB,
  latency_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,4),
  model VARCHAR(50) DEFAULT 'gemini-1.5-flash',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interactions_user ON agent_interactions(user_id);
CREATE INDEX idx_interactions_created ON agent_interactions(created_at DESC);

-- Agent state (for Flink stateful processing)
CREATE TABLE agent_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  agent_name VARCHAR(100) NOT NULL,
  state_key VARCHAR(255) NOT NULL,
  state_value JSONB,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, agent_name, state_key)
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
  market VARCHAR(20) DEFAULT 'US',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_news_symbol ON news_articles(symbol);
CREATE INDEX idx_news_published ON news_articles(published_at DESC);
```

**Tasks**:
- [ ] Run `./create-topics.sh`
- [ ] Apply PostgreSQL schema
- [ ] Create seed script for MSE data ingestion
- [ ] Test database connection

---

#### Day 4-5: MSE Data Ingestion Service

```typescript
// mse-ingestion-service/src/index.ts
import { Kafka } from 'kafkajs';
import { parse } from 'csv-parse/sync';
import { Pool } from 'pg';
import fs from 'fs';

class MSEIngestionService {
  private kafka: Kafka;
  private producer: Producer;
  private db: Pool;
  
  constructor() {
    this.kafka = new Kafka({
      clientId: 'mse-ingestion',
      brokers: [process.env.KAFKA_BROKER!]
    });
    this.producer = this.kafka.producer();
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }
  
  async ingestHistoricalData(csvFilePath: string) {
    console.log('Ingesting MSE historical data...');
    
    const content = fs.readFileSync(csvFilePath, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    
    for (const record of records) {
      // Insert into PostgreSQL
      await this.db.query(`
        INSERT INTO mse_price_history (symbol, date, open_price, high_price, low_price, close_price, volume)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (symbol, date) DO UPDATE
        SET open_price = EXCLUDED.open_price,
            high_price = EXCLUDED.high_price,
            low_price = EXCLUDED.low_price,
            close_price = EXCLUDED.close_price,
            volume = EXCLUDED.volume
      `, [
        record.symbol,
        record.date,
        record.open,
        record.high,
        record.low,
        record.close,
        record.volume
      ]);
      
      // Publish to Kafka for real-time processing
      await this.producer.send({
        topic: 'mse-stock-updates',
        messages: [{
          key: record.symbol,
          value: JSON.stringify({
            symbol: record.symbol,
            price: parseFloat(record.close),
            volume: parseInt(record.volume),
            timestamp: new Date(record.date).getTime()
          })
        }]
      });
    }
    
    console.log(`✓ Ingested ${records.length} MSE records`);
  }
  
  async streamRealTimeUpdates() {
    // If you have real-time MSE API, implement here
    // Otherwise, replay historical data for demo
    console.log('Streaming MSE updates to Kafka...');
  }
}

export default MSEIngestionService;
```

**Tasks**:
- [ ] Implement MSE ingestion service
- [ ] Parse your MSE CSV data
- [ ] Load into PostgreSQL
- [ ] Stream to Kafka
- [ ] Verify in Kafka UI

---

#### Day 6-7: Flink Intelligent Router

```python
# flink-jobs/intelligent_router.py
import os
import json
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.connectors.kafka import FlinkKafkaConsumer, FlinkKafkaProducer
from pyflink.common.serialization import SimpleStringSchema
import google.generativeai as genai

class IntelligentRouter:
    """
    Uses Gemini to understand user intent and route to appropriate agents.
    This is the "decision layer" from the article.
    """
    
    def __init__(self):
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        self.prompt_template = """
You are an intelligent routing agent for a stock analysis platform.

User Request: {query}
User Context:
- Portfolio: {portfolio_summary}
- Watchlist: {watchlist}
- Risk Tolerance: {risk_tolerance}
- Recent Activity: {recent_queries}

Available Agents:
1. portfolio - Portfolio analysis, rebalancing, buy/sell recommendations
2. market - Market trend analysis, sector analysis, momentum detection
3. news - News summarization, sentiment analysis, impact assessment
4. risk - Risk assessment, VaR calculation, stress testing
5. historical - Historical analysis, pattern detection, technical indicators

Route this request to the appropriate agent(s).

Respond ONLY with valid JSON (no markdown):
{{
  "primary_agent": "agent_name",
  "secondary_agents": ["agent1", "agent2"],
  "reasoning": "brief explanation",
  "requires_collaboration": true/false,
  "priority": "high|normal|low",
  "context_needed": ["data1", "data2"]
}}
"""
    
    def route(self, user_request: dict) -> dict:
        """Route request using Gemini LLM"""
        try:
            prompt = self.prompt_template.format(
                query=user_request.get('query', ''),
                portfolio_summary=user_request.get('context', {}).get('portfolio', 'None'),
                watchlist=user_request.get('context', {}).get('watchlist', []),
                risk_tolerance=user_request.get('context', {}).get('risk_tolerance', 'moderate'),
                recent_queries=user_request.get('context', {}).get('recent_queries', [])
            )
            
            response = self.model.generate_content(prompt)
            routing_decision = json.loads(response.text)
            
            # Add metadata
            routing_decision['correlation_id'] = user_request['correlation_id']
            routing_decision['user_id'] = user_request['user_id']
            routing_decision['original_query'] = user_request['query']
            routing_decision['timestamp'] = int(time.time() * 1000)
            
            return routing_decision
            
        except Exception as e:
            # Fallback to keyword-based routing
            return self.fallback_routing(user_request)
    
    def fallback_routing(self, request: dict) -> dict:
        """Simple keyword-based routing if LLM fails"""
        query_lower = request['query'].lower()
        
        keywords = {
            'portfolio': ['rebalance', 'buy', 'sell', 'portfolio', 'allocation'],
            'market': ['trend', 'market', 'sector', 'momentum'],
            'news': ['news', 'happened', 'what', 'sentiment'],
            'risk': ['risk', 'safe', 'volatile', 'var'],
            'historical': ['history', 'analyze', 'past', 'pattern']
        }
        
        for agent, words in keywords.items():
            if any(word in query_lower for word in words):
                return {
                    'primary_agent': agent,
                    'secondary_agents': [],
                    'reasoning': 'Fallback keyword matching',
                    'requires_collaboration': False,
                    'priority': 'normal',
                    'correlation_id': request['correlation_id'],
                    'user_id': request['user_id'],
                    'original_query': request['query']
                }
        
        # Default to portfolio agent
        return {
            'primary_agent': 'portfolio',
            'secondary_agents': [],
            'reasoning': 'Default routing',
            'requires_collaboration': False,
            'priority': 'normal',
            'correlation_id': request['correlation_id'],
            'user_id': request['user_id'],
            'original_query': request['query']
        }


def create_kafka_consumer(env):
    """Create Kafka consumer for user requests"""
    properties = {
        'bootstrap.servers': os.getenv('KAFKA_BROKER', 'localhost:9092'),
        'group.id': 'intelligent-router'
    }
    
    return FlinkKafkaConsumer(
        topics='user-requests',
        deserialization_schema=SimpleStringSchema(),
        properties=properties
    )


def create_kafka_producer():
    """Create Kafka producer for routing events"""
    properties = {
        'bootstrap.servers': os.getenv('KAFKA_BROKER', 'localhost:9092')
    }
    
    return FlinkKafkaProducer(
        topic='agent-routing-events',
        serialization_schema=SimpleStringSchema(),
        producer_config=properties
    )


class RoutingMapFunction(MapFunction):
    """Flink map function that routes requests"""
    
    def __init__(self):
        self.router = None
    
    def open(self, runtime_context):
        self.router = IntelligentRouter()
    
    def map(self, value):
        request = json.loads(value)
        routing_decision = self.router.route(request)
        return json.dumps(routing_decision)


def main():
    # Create execution environment
    env = StreamExecutionEnvironment.get_execution_environment()
    env.set_parallelism(2)
    
    # Add Kafka connector dependency
    env.add_jars("file:///opt/flink/lib/flink-sql-connector-kafka-3.0.1-1.18.jar")
    
    # Source: Consume from user-requests topic
    kafka_consumer = create_kafka_consumer(env)
    user_requests = env.add_source(kafka_consumer)
    
    # Process: Route using Gemini LLM
    routing_decisions = user_requests.map(RoutingMapFunction())
    
    # Sink: Produce to agent-routing-events topic
    kafka_producer = create_kafka_producer()
    routing_decisions.add_sink(kafka_producer)
    
    # Execute
    env.execute("Intelligent Router with Gemini")


if __name__ == '__main__':
    main()
```

**Tasks**:
- [ ] Set up Flink Python environment
- [ ] Implement intelligent router
- [ ] Test with sample requests
- [ ] Monitor in Flink UI
- [ ] Verify routing events in Kafka UI

---

### Phase 2: Core Agent Microservices (Week 2)

All agents in Node.js/TypeScript!

#### Portfolio Agent

```typescript
// portfolio-agent/src/index.ts
import { BaseAgent } from '../../shared/base-agent';
import { Pool } from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface PortfolioTask {
  correlationId: string;
  userId: string;
  query: string;
  context: any;
}

class PortfolioAgent extends BaseAgent {
  private db: Pool;
  
  constructor() {
    super('portfolio-agent', 'portfolio-tasks', 'portfolio-responses');
    
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }
  
  async process(task: PortfolioTask): Promise<any> {
    console.log(`Processing portfolio query: ${task.query}`);
    
    // 1. Fetch user portfolio
    const portfolio = await this.fetchPortfolio(task.userId);
    
    // 2. Calculate allocation
    const allocation = this.calculateAllocation(portfolio);
    
    // 3. Get market context (call market agent if needed)
    const marketContext = await this.getMarketContext();
    
    // 4. RAG retrieval
    const relevantInsights = await this.retrieveInsights(task.query);
    
    // 5. Generate recommendation with Gemini
    const recommendation = await this.generateRecommendation(
      task.query,
      portfolio,
      allocation,
      marketContext,
      relevantInsights
    );
    
    // 6. Store interaction
    await this.storeInteraction(task, recommendation);
    
    return {
      correlationId: task.correlationId,
      recommendation,
      allocation,
      confidence: 0.85,
      timestamp: Date.now()
    };
  }
  
  private async fetchPortfolio(userId: string) {
    const result = await this.db.query(`
      SELECT p.*, 
             CASE 
               WHEN p.market = 'MSE' THEN m.close_price
               ELSE NULL  -- Would fetch from Finnhub for US stocks
             END as current_price
      FROM portfolios p
      LEFT JOIN mse_price_history m ON p.symbol = m.symbol 
        AND m.date = (SELECT MAX(date) FROM mse_price_history WHERE symbol = p.symbol)
      WHERE p.user_id = $1
    `, [userId]);
    
    return result.rows;
  }
  
  private calculateAllocation(portfolio: any[]) {
    const totalValue = portfolio.reduce((sum, pos) => 
      sum + (pos.quantity * pos.current_price), 0
    );
    
    const bySector = portfolio.reduce((acc, pos) => {
      const value = pos.quantity * pos.current_price;
      const pct = (value / totalValue) * 100;
      
      acc[pos.sector] = (acc[pos.sector] || 0) + pct;
      return acc;
    }, {});
    
    return {
      totalValue,
      bySector,
      positions: portfolio.length
    };
  }
  
  private async generateRecommendation(
    query: string,
    portfolio: any[],
    allocation: any,
    marketContext: any,
    insights: any[]
  ): Promise<any> {
    const prompt = `
You are a portfolio advisor for the Mongolian and US stock markets.

User Query: ${query}

Current Portfolio:
${JSON.stringify(portfolio, null, 2)}

Allocation:
${JSON.stringify(allocation, null, 2)}

Market Context:
${JSON.stringify(marketContext, null, 2)}

Relevant Insights:
${insights.map(i => i.content).join('\n')}

Provide a detailed recommendation in JSON format:
{
  "summary": "brief answer to query",
  "recommendation": "detailed recommendation",
  "reasoning": ["reason 1", "reason 2", "reason 3"],
  "suggested_actions": [
    {
      "action": "buy|sell|hold",
      "symbol": "SYMBOL",
      "quantity": number,
      "reasoning": "why"
    }
  ],
  "risk_assessment": {
    "current_risk_level": "low|moderate|high",
    "recommendation_risk": "change description"
  },
  "expected_impact": {
    "return_potential": "percentage",
    "time_horizon": "timeframe"
  }
}
`;
    
    const result = await this.callGemini(prompt);
    return JSON.parse(result);
  }
  
  private async retrieveInsights(query: string) {
    // Call RAG service
    // For now, return empty
    return [];
  }
  
  private async getMarketContext() {
    // Simplified: fetch from database
    const mseData = await this.db.query(`
      SELECT symbol, close_price, volume
      FROM mse_price_history
      WHERE date = (SELECT MAX(date) FROM mse_price_history)
      ORDER BY volume DESC
      LIMIT 10
    `);
    
    return {
      mse_top_volume: mseData.rows,
      market_sentiment: 'neutral'  // Would come from news agent
    };
  }
  
  private async storeInteraction(task: any, recommendation: any) {
    await this.db.query(`
      INSERT INTO agent_interactions 
        (user_id, query, intent, primary_agent, response, model)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      task.userId,
      task.query,
      'portfolio_advice',
      'portfolio-agent',
      JSON.stringify(recommendation),
      'gemini-1.5-flash'
    ]);
  }
}

// Start agent
const agent = new PortfolioAgent();
agent.start().catch(console.error);
```

**Similar structure for**:
- Market Analysis Agent
- News Agent
- Historical Agent
- Risk Agent (with Python subprocess for Monte Carlo if needed)

---

This is getting long. Should I continue with the full revised plan, or do you want me to:

1. **Create a concise summary** of the changes?
2. **Focus on Phase 1** (infrastructure) and start implementation?
3. **Show you the complete backend structure** first?

Which would be most helpful?

