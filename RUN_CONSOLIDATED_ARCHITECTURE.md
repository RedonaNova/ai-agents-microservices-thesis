# Quick Start: Consolidated Architecture

## Running the 4-Agent Architecture

### Prerequisites
- ✅ Docker services running (Kafka, PostgreSQL)
- ✅ Backend `.env` file configured
- ✅ Node.js v24+ installed

### Start All Services (5 terminals)

#### Terminal 1: Investment Agent
```bash
cd /home/it/apps/thesis-report/backend/investment-agent
npm run dev
```
**Capabilities**: Portfolio advice, market analysis, historical analysis, risk assessment

#### Terminal 2: Notification Agent
```bash
cd /home/it/apps/thesis-report/backend/notification-agent
npm run dev
```
**Capabilities**: Welcome emails, daily news summaries

#### Terminal 3: News Intelligence Agent
```bash
cd /home/it/apps/thesis-report/backend/news-intelligence-agent
npm run dev
```
**Capabilities**: News fetching, sentiment analysis

#### Terminal 4: Orchestrator Agent (optional)
```bash
cd /home/it/apps/thesis-report/backend/orchestrator-agent
npm run dev
```
**Capabilities**: Intent classification, routing

#### Terminal 5: API Gateway
```bash
cd /home/it/apps/thesis-report/backend/api-gateway
npm run dev
```
**Capabilities**: HTTP → Kafka bridge, SSE responses

---

## Testing Endpoints

### Health Check
```bash
curl http://localhost:3001/health
```

### Portfolio Advice
```bash
curl -X POST http://localhost:3001/api/agent/portfolio/advice \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "investmentAmount": 10000000,
    "riskTolerance": "medium"
  }'
```

### Market Analysis
```bash
curl -X POST http://localhost:3001/api/agent/market/analyze \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}'
```

### Historical Analysis
```bash
curl -X POST http://localhost:3001/api/agent/historical/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "symbol": "APU-O-0000",
    "period": 90
  }'
```

### Risk Assessment
```bash
curl -X POST http://localhost:3001/api/agent/risk/assess \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "symbols": ["APU-O-0000", "MBT-B-0000"]
  }'
```

### Welcome Email (Registration)
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "country": "Mongolia"
  }'
```

---

## Comparison with 8-Agent Architecture

### 8-Agent (Microservices)
```bash
# Terminal 1-8: Individual agents
cd backend/orchestrator-agent && npm run dev
cd backend/portfolio-advisor-agent && npm run dev
cd backend/market-analysis-agent && npm run dev
cd backend/historical-analysis-agent && npm run dev
cd backend/risk-assessment-agent && npm run dev
cd backend/news-intelligence-agent && npm run dev
cd backend/welcome-email-agent && npm run dev
cd backend/daily-news-agent && npm run dev
# Terminal 9: API Gateway
cd backend/api-gateway && npm run dev
```
**Total**: 9 processes

### 4-Agent (Consolidated)
```bash
# Terminal 1-4: Consolidated agents
cd backend/investment-agent && npm run dev          # Replaces 4 agents
cd backend/notification-agent && npm run dev        # Replaces 2 agents
cd backend/news-intelligence-agent && npm run dev
cd backend/orchestrator-agent && npm run dev
# Terminal 5: API Gateway
cd backend/api-gateway && npm run dev
```
**Total**: 5 processes (44% reduction!)

---

## Architecture Diagram

```
Frontend (Next.js)
       ↓
API Gateway (Port 3001)
       ↓
   Kafka Topics
   ├─ portfolio-requests
   ├─ market-analysis-requests
   ├─ historical-analysis-requests
   ├─ risk-assessment-requests
   ├─ news-requests
   ├─ user-registration-events
   └─ daily-news-trigger
       ↓
┌───────────────────┬───────────────────┬───────────────┐
│ Investment Agent  │ Notification Agent│ News Agent    │
│                   │                   │               │
│ • Portfolio       │ • Welcome Email   │ • News Fetch  │
│ • Market          │ • Daily News      │ • Sentiment   │
│ • Historical      │                   │               │
│ • Risk            │                   │               │
└───────────────────┴───────────────────┴───────────────┘
       ↓
PostgreSQL + Redis + MongoDB
```

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Kafka Not Responding
```bash
# Check Kafka status
docker ps | grep kafka

# Restart Kafka
docker restart thesis-kafka
```

### Gemini API 403 Error
```bash
# Check API key in .env
cat backend/.env | grep GEMINI_API_KEY

# Update if needed
echo "GEMINI_API_KEY=your_actual_key" >> backend/.env
```

### MongoDB Connection Error
```bash
# Start MongoDB (if using Docker)
docker start thesis-mongodb

# Or check your MONGODB_URI in .env
```

---

## Performance Monitoring

### Check Agent Logs
```bash
# Investment Agent
tail -f backend/investment-agent/logs/app.log

# Notification Agent
tail -f backend/notification-agent/logs/app.log

# API Gateway
tail -f backend/api-gateway/logs/app.log
```

### Monitor Kafka Topics
```bash
# List topics
docker exec thesis-kafka kafka-topics --list --bootstrap-server localhost:9092

# Monitor a topic
docker exec thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-responses \
  --from-beginning
```

### Check Resource Usage
```bash
# Memory usage
ps aux | grep -E "investment-agent|notification-agent" | awk '{print $4, $11}'

# Process count
ps aux | grep node | grep -E "agent|gateway" | wc -l
```

---

## Stopping Services

### Graceful Shutdown
```bash
# In each terminal, press Ctrl+C
# Services will gracefully disconnect from Kafka and databases
```

### Force Kill All
```bash
# Kill all agent processes
pkill -f "investment-agent"
pkill -f "notification-agent"
pkill -f "news-intelligence-agent"
pkill -f "api-gateway"
```

---

## Environment Variables Checklist

Required in `/home/it/apps/thesis-report/backend/.env`:
```bash
# Database
DATABASE_URL=postgresql://thesis_user:thesis_pass@localhost:5432/thesis_db

# Kafka
KAFKA_BROKER=localhost:9092

# AI
GEMINI_API_KEY=your_gemini_api_key_here

# SMTP (for emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=your_email@gmail.com

# External APIs
FINNHUB_API_KEY=your_finnhub_key

# MongoDB (optional)
MONGODB_URI=mongodb://localhost:27017/stocks_app

# Logging
LOG_LEVEL=info
```

---

## Success Indicators

When everything is running correctly, you should see:

✅ **Investment Agent**:
```
[info] Investment Agent started consuming messages
[info] Subscribed Topics: portfolio-requests, market-analysis-requests, ...
```

✅ **Notification Agent**:
```
[info] Notification Agent is running!
[info] Schedule: Daily news: 12:00 PM (cron: 0 12 * * *)
```

✅ **API Gateway**:
```
[info] API Gateway listening on port 3001
[info] API Gateway is ready!
```

---

## Quick Reference: What Consolidated Where

| Old Agent | New Agent | Location |
|-----------|-----------|----------|
| Portfolio Advisor | Investment Agent | `backend/investment-agent` |
| Market Analysis | Investment Agent | `backend/investment-agent` |
| Historical Analysis | Investment Agent | `backend/investment-agent` |
| Risk Assessment | Investment Agent | `backend/investment-agent` |
| Welcome Email | Notification Agent | `backend/notification-agent` |
| Daily News | Notification Agent | `backend/notification-agent` |
| News Intelligence | (Unchanged) | `backend/news-intelligence-agent` |
| Orchestrator | (Unchanged) | `backend/orchestrator-agent` |

---

**Last Updated**: November 8, 2025  
**Architecture**: 4-Agent Consolidated  
**Status**: Production Ready ✅

