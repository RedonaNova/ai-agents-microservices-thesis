# 🚀 Backend - Complete Guide

**Last Updated**: November 11, 2025  
**Status**: ✅ **OPERATIONAL - Ready for Thesis Demo**

---

## 📁 Active Services (6 Agents + API Gateway)

```
backend/
├── api-gateway/         ✅ REST API, Auth, Watchlist, Daily News (Port 3001)
├── orchestrator-agent/  ✅ Intent classification & routing
├── investment-agent/    ✅ Portfolio advice & market analysis
├── news-agent/          ✅ News fetching & sentiment analysis
├── knowledge-agent/     ✅ RAG with Mongolian support
├── flink-planner/       ✅ PyFlink for complex queries (Python)
└── database/            ✅ PostgreSQL schema & migrations
```

---

## 🚀 Quick Start

### Start Everything
```bash
cd /home/it/apps/thesis-report
./start-all-services.sh
```

### Stop Everything
```bash
./stop-all-services.sh
```

### Access Points
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3001
- **Kafka UI**: http://localhost:8080

---

## 📊 What's Working

| Feature | Endpoint | Status |
|---------|----------|--------|
| **User Registration** | `POST /api/users/register` | ✅ With personalized email |
| **User Login** | `POST /api/users/login` | ✅ JWT auth |
| **Watchlist CRUD** | `GET/POST/DELETE /api/watchlist` | ✅ Full CRUD |
| **Daily News Email** | `POST /api/daily-news/send` | ✅ Gemini AI-powered |
| **AI Agent Query** | `POST /api/agent/query` | ✅ Event-driven |
| **AI Response (SSE)** | `GET /api/agent/stream/:id` | ✅ Real-time streaming |

---

## 🧪 Test Commands

### 1. Register User
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "demo123",
    "name": "Demo User"
  }'
```

### 2. Create Watchlist
```bash
TOKEN="<jwt_from_registration>"
curl -X POST http://localhost:3001/api/watchlist \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "My Stocks"}'
```

### 3. Query AI Agent (with SSE response)
```typescript
// Frontend code
const response = await fetch('http://localhost:3001/api/agent/query', {
  method: 'POST',
  body: JSON.stringify({ query: "Investment advice?", type: "investment" })
});
const { requestId } = await response.json();

// Stream response
const eventSource = new EventSource(`http://localhost:3001/api/agent/stream/${requestId}`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('AI Response:', data);
};
```

---

## 📖 Documentation Files

- **`BACKEND_APIS.md`** - Complete API reference
- **`BACKEND_ANSWERS.md`** - All your questions answered
- **`BACKEND_STATUS_FIXED.md`** - Detailed status after cleanup
- **`BACKEND_IMPLEMENTATION_SUMMARY.md`** - Implementation notes

---

## 🔥 For Thesis Defense

**Your backend demonstrates**:
- ✅ Event-driven microservices architecture
- ✅ Apache Kafka message bus (12 topics)
- ✅ AI agent orchestration with Gemini
- ✅ PostgreSQL as single source of truth
- ✅ Real-time responses via Server-Sent Events
- ✅ PyFlink for stream processing
- ✅ JWT authentication
- ✅ Email automation with AI personalization

**6 Active Agents** working together via Kafka!

---

## 📁 Log Files

```bash
tail -f logs/api-gateway.log
tail -f logs/orchestrator-agent.log
tail -f logs/investment-agent.log
tail -f logs/news-agent.log
tail -f logs/knowledge-agent.log
tail -f logs/flink-planner.log
```

---

## 🎯 Next Steps (Optional)

1. ⏳ Add agent heartbeats to monitoring
2. 🔜 Integrate MSE data (mse-ingestion-service)
3. 🔜 Connect frontend to new APIs

---

**🎉 Your backend is ready for thesis demonstration!**

