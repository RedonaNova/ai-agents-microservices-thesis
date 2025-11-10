# Backend Startup Guide

## 🚀 Quick Start

### Start All Services
```bash
./start-backend.sh
```

### Stop All Services
```bash
./stop-backend.sh
```

---

## 📋 What Gets Started

The startup script launches 5 services:

1. **API Gateway** (Port 3001)
   - Frontend HTTP endpoint
   - Kafka producer/consumer
   - SSE for real-time responses

2. **Orchestrator Agent**
   - Intent classification
   - Request routing
   - Gemini AI integration

3. **Investment Agent** (Consolidated)
   - Portfolio advice
   - Market analysis
   - Historical analysis
   - Risk assessment

4. **News Intelligence Agent**
   - News fetching (Finnhub + MSE)
   - Sentiment analysis
   - AI insights

5. **Notification Agent** (Consolidated)
   - Welcome emails
   - Daily news summaries
   - SMTP delivery

---

## 📊 Monitoring

### Check Service Status
```bash
ps aux | grep -E "api-gateway|agent" | grep -v grep
```

### View All Logs
```bash
tail -f /tmp/thesis-logs/*.log
```

### View Specific Service Log
```bash
tail -f /tmp/thesis-logs/api-gateway.log
tail -f /tmp/thesis-logs/orchestrator-agent.log
tail -f /tmp/thesis-logs/investment-agent.log
tail -f /tmp/thesis-logs/news-intelligence-agent.log
tail -f /tmp/thesis-logs/notification-agent.log
```

---

## 🔧 Troubleshooting

### Issue: "Kafka is not running"
**Solution:**
```bash
cd /home/it/apps/thesis-report
docker-compose up -d
```

### Issue: "Service failed to start"
**Check logs:**
```bash
tail -100 /tmp/thesis-logs/*.log
```

**Common causes:**
- Kafka not running (start Docker services first)
- PostgreSQL not running (start Docker services first)
- Port 3001 already in use (kill existing process)
- Missing environment variables (check .env file)

### Issue: "Port 3001 already in use"
**Solution:**
```bash
npx kill-port 3001
./start-backend.sh
```

### Issue: "Agent crashed after starting"
**Check environment variables:**
```bash
# Required in .env file:
DATABASE_URL=postgresql://thesis_user:thesis_pass@localhost:5432/thesis_db
KAFKA_BROKER=localhost:9092
GEMINI_API_KEY=your-key-here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MONGODB_URI=mongodb://localhost:27017/thesis_db
```

---

## 🧪 Testing After Startup

### 1. Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-08T..."
}
```

### 2. Test Welcome Email
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "country": "Mongolia"
  }'
```

### 3. Test Portfolio Advice
```bash
curl -X POST http://localhost:3001/api/agent/investment/portfolio/advice \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "investmentAmount": 5000000,
    "riskTolerance": "moderate"
  }'
```

### 4. Test News Fetching
```bash
curl -X POST http://localhost:3001/api/agent/news \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["APU-O-0000", "MNET-O-0000"],
    "days": 7
  }'
```

---

## 📁 File Locations

- **Scripts**: `/home/it/apps/thesis-report/*.sh`
- **Logs**: `/tmp/thesis-logs/*.log`
- **PIDs**: `/tmp/thesis-backend-pids.txt`
- **Source**: `/home/it/apps/thesis-report/backend/*-agent/`

---

## 🔄 Restart Services

```bash
./stop-backend.sh
./start-backend.sh
```

---

## 📝 Notes

- All services run in the background
- Logs are written to `/tmp/thesis-logs/`
- PIDs are saved for graceful shutdown
- Services auto-reconnect to Kafka on failure
- Email sending requires valid SMTP credentials

---

## 🎯 For Demo/Thesis Defense

1. Start Docker services: `docker-compose up -d`
2. Start backend: `./start-backend.sh`
3. Start frontend: `cd frontend && npm run dev`
4. Open browser: `http://localhost:3000`

Done! 🎉

