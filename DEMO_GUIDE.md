# Thesis Demo Guide - Event-Driven AI Agents Architecture

**Author**: Bachelor's Thesis Candidate  
**Topic**: AI Agents in Microservice Architecture with Apache Kafka & Flink  
**Demo Duration**: 10-15 minutes

---

## 🎯 Demo Objectives

1. Demonstrate **event-driven microservices architecture**
2. Show **real-time stream processing** with Apache Flink
3. Prove **scalability and fault tolerance**
4. Display **AI agents** working together via Kafka
5. Show **Mongolian language support** (RAG)

---

## 🚀 Pre-Demo Setup (5 minutes)

### 1. Start All Services

```bash
./start-all-services.sh
```

This will start:
- ✅ Infrastructure (Kafka, Zookeeper, PostgreSQL, MongoDB, Qdrant, Redis, Flink)
- ✅ 5 Backend Agents (Orchestrator, Investment, News, Notification, RAG)
- ✅ API Gateway
- ✅ Frontend

**Wait for**: "ALL SERVICES STARTED" message (2-3 minutes)

### 2. Verify Services

```bash
# Check Docker services
cd backend && docker-compose ps

# Check backend logs
tail -f ../logs/*.log
```

### 3. Open Browser Tabs

- http://localhost:3000 - **Frontend** (main demo)
- http://localhost:8080 - **Kafka UI** (show event flow)
- http://localhost:8081 - **Flink Dashboard** (show stream processing)
- http://localhost:3001/health - **API Gateway** (health check)

---

## 📋 Demo Script

### Part 1: System Architecture (3 minutes)

**Navigate to**: http://localhost:3000/ai-agents

**Show**:
1. Click "Architecture & Monitoring" tab
2. **Point out the layers**:
   - Frontend (Next.js)
   - API Gateway (Express)
   - **Kafka** (Event Bus) ← KEY POINT
   - AI Agents (5 services)
   - Data Layer (PostgreSQL, Qdrant)
   - **Flink** (Stream Processing) ← KEY POINT

3. **Highlight**:
   - "See the green dots? These show active agents"
   - "All agents communicate asynchronously via Kafka"
   - "No direct coupling between services"

**Switch to Kafka UI** (http://localhost:8080):
- Show topics list
- Show messages in `agent-requests` topic
- Show `watchlist-analytics` topic (Flink output)

### Part 2: Dashboard with MSE Data (2 minutes)

**Navigate to**: http://localhost:3000

**Show the 3 tabs**:

1. **Global Stocks Tab**:
   - TradingView widgets
   - "This shows global market data"

2. **MSE Stocks Tab** ← IMPORTANT:
   - Sector Heatmap: "Real-time sector performance"
   - Top Movers: "Gainers and losers"
   - Data Table: "50+ MSE stocks, sortable"
   - **Click a column header** to sort
   - **Hover and click star** to add to watchlist

3. **Explain**: "MSE data is from PostgreSQL, analyzed by Flink"

### Part 3: Unified Search (1 minute)

**Press Ctrl+K** (or Cmd+K):

1. Type "tesla" → Show global stocks
2. Type "банк" (Mongolian for "bank") → Show MSE stocks
3. **Point out**:
   - "Same UI, different sources"
   - "MSE results are from local database"
   - "Star icon adds to watchlist instantly"

### Part 4: AI Agents in Action (4 minutes)

**Navigate to**: http://localhost:3000/ai-agents

**Click "AI Chat Interface" tab**:

#### Test 1: Portfolio Question
```
User: "Should I invest in APU?"
```

**Explain while waiting**:
- "This goes to Orchestrator Agent"
- "Orchestrator routes to Investment Agent"
- "Investment Agent analyzes MSE data"
- "Response streams back via Server-Sent Events"

**Show Response** - AI gives analysis of APU stock

#### Test 2: MSE Search (RAG)
```
User: "What are the top MSE banks?"
```

**Explain**:
- "This uses RAG Service"
- "Qdrant vector database with 75 MSE companies"
- "Semantic search in Mongolian language"
- "Response is in Mongolian!"

### Part 5: Real-Time Stream Processing (2 minutes)

**Switch to Flink Dashboard** (http://localhost:8081):

1. **Show**:
   - JobManager status
   - TaskManagers (2 running)
   - "We have 2 Flink jobs ready to deploy"

2. **Explain**:
   - "Watchlist Aggregator: Real-time portfolio metrics"
   - "Trading History Aggregator: Moving averages, VWAP, momentum"
   - "These process events from Kafka in 5-minute windows"

3. **Go back to frontend** → Show Architecture tab:
   - "Flink consumes from Kafka"
   - "Outputs to `trading-analytics` and `watchlist-analytics` topics"
   - "Frontend can subscribe to these for real-time updates"

### Part 6: Watchlist Feature (2 minutes)

**Navigate to**: http://localhost:3000/watchlist

1. **Show**:
   - Combined watchlist (global + MSE)
   - Real-time data
   - "Get AI Advice" button

2. **Click "Зөвлөгөө авах"** (Get Advice):
   - AI analyzes entire portfolio
   - Gives recommendations
   - "Powered by Investment Agent via Kafka"

3. **Explain**: "Watchlist events go to Kafka → Flink aggregates → Real-time analytics"

### Part 7: System Monitoring (1 minute)

**Navigate to**: http://localhost:3000/ai-agents → Architecture tab

**Show Agent Status**:
- Active agents count
- Total messages processed
- System health: "Healthy" or "Degraded"
- "This is real-time monitoring via SSE"

---

## 🎓 Key Talking Points for Thesis Defense

### 1. Event-Driven Architecture
> "All communication happens asynchronously via Kafka. This means agents can scale independently, and if one fails, others continue working."

### 2. Apache Flink
> "Flink provides real-time stream processing. It aggregates watchlist events and trading data in sliding windows, computing technical indicators on the fly."

### 3. Microservices Benefits
> "We have 5 independent agents. Each can be deployed, scaled, and updated separately. Compare this to a monolithic system where everything is coupled."

### 4. AI Integration
> "All agents use Gemini 2.0 Flash for LLM capabilities. The RAG service uses Qdrant for semantic search with Mongolian language support."

### 5. Scalability
> "We can add more Flink TaskManagers for parallel processing. We can add more agent instances for load balancing. Kafka handles message distribution."

### 6. Fault Tolerance
> "Kafka persists messages. Flink has checkpointing. If a service crashes, it can resume from the last checkpoint."

---

## 🐛 Troubleshooting

### Problem: Services won't start
```bash
# Check if ports are free
lsof -ti:3000 3001 9092 5432 6333 6379 27017 8081

# Kill processes
./stop-all-services.sh
sleep 5
./start-all-services.sh
```

### Problem: Agents not responding
```bash
# Check agent logs
tail -f logs/orchestrator-agent.log
tail -f logs/investment-agent.log

# Restart specific agent
cd backend/investment-agent
npm run dev
```

### Problem: Kafka not ready
```bash
# Check Kafka health
docker exec -it thesis-kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# Restart Kafka
cd backend
docker-compose restart kafka
```

### Problem: Flink jobs not deployed
```bash
# Build Flink jobs
cd backend/flink-jobs/watchlist-aggregator
mvn clean package

# Deploy manually via Flink UI (http://localhost:8081)
```

---

## 📊 Performance Metrics to Mention

- **Agent Response Time**: ~1-3 seconds (includes LLM call)
- **Search Latency**: <100ms (direct database)
- **Kafka Throughput**: 1000+ messages/second potential
- **Flink Processing**: 5-minute windows, sub-second latency
- **System Uptime**: Designed for 99.9% availability

---

## 🔚 Post-Demo Cleanup

```bash
./stop-all-services.sh
```

---

## 📝 Questions You Might Get

### Q: Why Kafka over REST APIs?
**A**: "Kafka provides async communication, message persistence, and natural scalability. REST would create tight coupling and synchronous blocking."

### Q: Why not just use a monolith?
**A**: "Monoliths couple everything together. One bug can crash the entire system. With microservices, each agent is isolated. We can also scale hot services independently."

### Q: What if Kafka goes down?
**A**: "Kafka has built-in replication. In production, we'd run a Kafka cluster with 3+ brokers. Messages are persisted to disk, so no data loss."

### Q: How do you handle consistency?
**A**: "We use eventual consistency. Events are ordered in Kafka topics. Flink maintains state with checkpoints. For critical operations, we use idempotent consumers."

### Q: Why Flink and not Kafka Streams?
**A**: "Flink provides more advanced windowing, state management, and complex event processing. It's better for real-time analytics and ML pipelines."

---

## ✅ Success Criteria

Demo is successful if you can show:
- ✅ All services running and communicating
- ✅ Real-time data flow through Kafka
- ✅ AI agents responding to queries
- ✅ Flink dashboard showing stream processing capability
- ✅ Mongolian language support working
- ✅ System monitoring showing health status

---

## 🎉 Good Luck!

Remember: **Your thesis contribution is the architecture, not the features.** Focus on showing how events flow, how services scale, and how Flink processes streams.

**Time Management**:
- Architecture: 3 min
- MSE Data: 2 min
- Search: 1 min
- AI Agents: 4 min
- Flink: 2 min
- Watchlist: 2 min
- Monitoring: 1 min
- **Total: 15 minutes**

Leave 5 minutes for questions!

