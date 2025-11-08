# Orchestrator Agent

The Orchestrator Agent is the central intelligence layer that routes user requests to specialized AI agents in the microservice architecture.

## 🎯 Purpose

- **Intent Classification**: Uses Gemini API to understand user intent
- **Smart Routing**: Routes requests to appropriate specialized agents
- **Response Aggregation**: Combines responses from multiple agents when needed
- **Event-Driven**: Communicates via Kafka for decoupled architecture

## 🏗️ Architecture

```
User Request → Kafka (user-requests)
              ↓
      Orchestrator Agent
       ├── Gemini Intent Classifier
       ├── Agent Router
       └── Request Processor
              ↓
      Specialized Agents (via Kafka topics)
       ├── Portfolio Advisor
       ├── Market Analysis
       ├── News Intelligence
       ├── Historical Analysis
       └── Risk Assessment
              ↓
User Response ← Kafka (user-responses)
```

## 📋 Features

### 1. Intent Classification
Uses Google Gemini to classify user intents:
- `portfolio_advice` - Investment recommendations
- `market_analysis` - Market trends and analysis
- `news_query` - News and sentiment analysis
- `historical_analysis` - Historical data and charts
- `risk_assessment` - Risk metrics and analysis
- `general_query` - General stock questions

### 2. Smart Routing
- Routes to appropriate agent based on intent
- Handles multi-agent scenarios
- Priority-based routing (high/medium/low)
- Fallback mechanisms

### 3. Response Aggregation
- Combines responses from multiple agents
- Timeout handling for slow agents
- Partial response support

### 4. Event-Driven Communication
- Consumes from: `user-requests`
- Produces to: `user-responses`, `portfolio-events`, `market-analysis-events`, `news-events`, `risk-assessment-events`

## 🚀 Quick Start

### Install Dependencies
```bash
cd backend/orchestrator-agent
npm install
```

### Configuration
Environment variables are loaded from `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key
KAFKA_BROKER=localhost:9092
LOG_LEVEL=info
```

### Run Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

## 📊 Example User Requests

### Portfolio Advice
```json
{
  "requestId": "req-001",
  "userId": "user-123",
  "message": "Should I invest in tech stocks right now?",
  "timestamp": "2025-11-08T01:00:00Z"
}
```

### Market Analysis
```json
{
  "requestId": "req-002",
  "userId": "user-123",
  "message": "What are the current market trends in the energy sector?",
  "timestamp": "2025-11-08T01:00:00Z"
}
```

### News Query
```json
{
  "requestId": "req-003",
  "userId": "user-123",
  "message": "Get me the latest news about AAPL stock",
  "timestamp": "2025-11-08T01:00:00Z"
}
```

## 🔧 Testing

### Send Test Message to Kafka
```bash
# Using kafka-console-producer
echo '{"requestId":"test-001","userId":"user-123","message":"What is the best stock to buy?","timestamp":"2025-11-08T01:00:00Z"}' | \
docker exec -i thesis-kafka kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic user-requests
```

### Read Responses
```bash
# Using kafka-console-consumer
docker exec thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-responses \
  --from-beginning
```

## 📁 Project Structure

```
orchestrator-agent/
├── src/
│   ├── index.ts              # Main entry point
│   ├── types.ts              # TypeScript types
│   ├── logger.ts             # Winston logger
│   ├── gemini-client.ts      # Gemini API integration
│   ├── kafka-client.ts       # Kafka consumer/producer
│   ├── agent-router.ts       # Routing logic
│   └── request-processor.ts  # Main orchestration logic
├── package.json
├── tsconfig.json
└── README.md
```

## 🔍 How It Works

1. **Receive Request**: Listens to `user-requests` Kafka topic
2. **Classify Intent**: Uses Gemini to understand what the user wants
3. **Route**: Determines which specialized agent should handle it
4. **Dispatch**: Sends request to agent's Kafka topic
5. **Aggregate**: (Optional) Waits for multiple agent responses
6. **Respond**: Sends final response to `user-responses` topic

## 🎓 For Your Thesis

This orchestrator demonstrates:

### Event-Driven Architecture
- ✅ Loose coupling via Kafka
- ✅ Asynchronous communication
- ✅ Scalable message handling

### AI Agent Pattern
- ✅ Intent classification with LLM
- ✅ Dynamic routing
- ✅ Multi-agent coordination

### Microservices Best Practices
- ✅ Single Responsibility Principle
- ✅ Service discovery
- ✅ Graceful shutdown
- ✅ Error handling

## 📊 Monitoring

Check logs:
```bash
# In development
npm run dev

# View Kafka UI
open http://localhost:8080
```

## 🐛 Troubleshooting

### Kafka Connection Issues
```bash
# Check Kafka is running
docker ps | grep thesis-kafka

# Check topics exist
docker exec thesis-kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Gemini API Issues
```bash
# Verify API key
echo $GEMINI_API_KEY

# Test with curl
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

## 🚀 Next Steps

1. **Build Specialized Agents**: Portfolio Advisor, Market Analysis, etc.
2. **Add Monitoring**: Prometheus metrics
3. **Implement Caching**: Redis for frequent queries
4. **Add Authentication**: JWT validation
5. **Rate Limiting**: Prevent API abuse

---

**Status**: ✅ Completed and ready for integration

**Dependencies**: Kafka, Gemini API, TypeScript, Node.js

