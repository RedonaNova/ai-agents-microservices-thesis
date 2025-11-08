# Testing Guide - API Gateway & Agents

## 🚀 Complete Testing Procedure

### Prerequisites
Ensure all infrastructure is running:
```bash
cd /home/it/apps/thesis-report/backend
docker-compose up -d
docker ps  # Verify all containers are running
```

---

## 1. Start API Gateway

### Open a dedicated terminal:
```bash
cd /home/it/apps/thesis-report/backend/api-gateway
export KAFKAJS_NO_PARTITIONER_WARNING=1
npm run dev
```

**Expected Output**:
```
info: Starting API Gateway...
warn: MongoDB connection failed - continuing without it
info: Kafka producer connected
info: API Gateway listening on port 3001
info: API Gateway is ready!
```

### Test Health Check:
```bash
curl http://localhost:3001/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-08T...",
  "uptime": 1.234,
  "service": "api-gateway"
}
```

---

## 2. Test User Registration (Welcome Email Flow)

### Send Registration Request:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "country": "Mongolia",
    "investmentGoals": "Long-term growth",
    "riskTolerance": "moderate",
    "preferredIndustry": "Technology"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "requestId": "uuid-here",
  "message": "Registration processed. Welcome email will be sent shortly."
}
```

### Monitor Kafka Topic:
```bash
docker exec thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-registration-events \
  --from-beginning \
  --max-messages 1
```

**Should see**: JSON event with user data

---

## 3. Test Portfolio Advice

### Send Request:
```bash
curl -X POST http://localhost:3001/api/agent/portfolio/advice \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "investmentAmount": 5000000,
    "riskTolerance": "moderate",
    "preferences": {
      "sectors": ["technology", "finance"],
      "timeHorizon": "long-term"
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "requestId": "uuid-here",
  "message": "Processing portfolio advice request"
}
```

### Monitor Agent Response:
```bash
# Save requestId from above, then:
docker exec thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-responses \
  --from-beginning | grep "portfolio-advisor"
```

**Should see**: Portfolio advice JSON with recommendations

---

## 4. Test Market Analysis

```bash
curl -X POST http://localhost:3001/api/agent/market/analyze \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123"}'
```

### Monitor Response:
```bash
docker exec thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-responses \
  --from-beginning | grep "market-analysis"
```

**Should see**: Market overview with top/bottom performers

---

## 5. Test Historical Analysis

```bash
curl -X POST http://localhost:3001/api/agent/historical/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "symbol": "APU-O-0000",
    "period": 90
  }'
```

**Should see**: Technical indicators (SMA, RSI, MACD, Bollinger Bands)

---

## 6. Test Risk Assessment

```bash
curl -X POST http://localhost:3001/api/agent/risk/assess \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "portfolio": [
      {"symbol": "APU-O-0000", "shares": 100, "avgPrice": 1000}
    ],
    "confidenceLevel": 0.95
  }'
```

**Should see**: VaR analysis + Monte Carlo simulation results

---

## 7. Test News Intelligence

```bash
curl http://localhost:3001/api/news?userId=user-123
```

**Should see**: Request queued, use SSE to get results

---

## 8. Test Server-Sent Events (SSE)

### Terminal 1 - Send Request:
```bash
REQUEST_ID=$(curl -s -X POST http://localhost:3001/api/agent/portfolio/advice \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","investmentAmount":5000000}' | jq -r '.requestId')

echo "Request ID: $REQUEST_ID"
```

### Terminal 2 - Listen via SSE:
```bash
curl -N http://localhost:3001/api/agent/stream/$REQUEST_ID
```

**Should see**:
```
data: {"type":"connected","requestId":"..."}

data: {"requestId":"...","agent":"portfolio-advisor","status":"success","data":{...}}

data: {"type":"complete"}
```

---

## 9. Test Finnhub Integration (Optional)

### Add Finnhub Route (if needed):
Create `/backend/api-gateway/src/routes/finnhub.routes.ts`:

```typescript
import { Router, Request, Response } from 'express';
import logger from '../services/logger';

const router = Router();

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';

router.get('/stocks/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const url = `${FINNHUB_BASE_URL}/search?q=${q}&token=${FINNHUB_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    logger.error('Finnhub search error', { error });
    res.status(500).json({ error: 'Failed to search stocks' });
  }
});

router.get('/stocks/news', async (req: Request, res: Response) => {
  try {
    const { symbol, from, to } = req.query;
    const url = symbol
      ? `${FINNHUB_BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
      : `${FINNHUB_BASE_URL}/news?category=general&token=${FINNHUB_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    logger.error('Finnhub news error', { error });
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

export default router;
```

### Add to main server:
```typescript
// In src/index.ts
import finnhubRoutes from './routes/finnhub.routes';
app.use('/api/finnhub', finnhubRoutes);
```

### Test:
```bash
curl "http://localhost:3001/api/finnhub/stocks/search?q=AAPL"
curl "http://localhost:3001/api/finnhub/stocks/news?symbol=AAPL&from=2025-11-01&to=2025-11-08"
```

---

## 10. Monitor All Agents

### Check All Agents Running:
```bash
ps aux | grep "tsx watch" | grep -v grep
```

**Should see**:
- orchestrator-agent
- portfolio-advisor-agent
- market-analysis-agent
- news-intelligence-agent
- historical-analysis-agent
- risk-assessment-agent
- api-gateway

### Monitor All Kafka Topics:
```bash
# Terminal 1 - Requests
docker exec thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic portfolio-events \
  --from-beginning

# Terminal 2 - Responses
docker exec thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-responses \
  --from-beginning
```

---

## 11. Performance Testing

### Load Test with Multiple Requests:
```bash
# Install Apache Bench (if not installed)
# sudo apt-get install apache2-utils

# Test 100 requests, 10 concurrent
ab -n 100 -c 10 -T 'application/json' \
  -p request.json \
  http://localhost:3001/api/agent/market/analyze
```

Where `request.json`:
```json
{"userId": "test-user"}
```

---

## 12. End-to-End Integration Test

### Complete Flow Test:
```bash
#!/bin/bash

echo "=== Starting End-to-End Test ==="

# 1. Health check
echo "1. Testing health endpoint..."
curl -s http://localhost:3001/health | jq '.status'

# 2. Register user
echo "2. Registering user..."
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","name":"Test","country":"Mongolia"}' \
  | jq '.success'

# 3. Get portfolio advice
echo "3. Requesting portfolio advice..."
PORTFOLIO_REQ=$(curl -s -X POST http://localhost:3001/api/agent/portfolio/advice \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","investmentAmount":5000000,"riskTolerance":"moderate"}' \
  | jq -r '.requestId')
echo "Portfolio Request ID: $PORTFOLIO_REQ"

# 4. Get market analysis
echo "4. Requesting market analysis..."
MARKET_REQ=$(curl -s -X POST http://localhost:3001/api/agent/market/analyze \
  -H "Content-Type: application/json" \
  -d '{"userId":"test"}' \
  | jq -r '.requestId')
echo "Market Request ID: $MARKET_REQ"

# 5. Get historical analysis
echo "5. Requesting historical analysis..."
HIST_REQ=$(curl -s -X POST http://localhost:3001/api/agent/historical/analyze \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","symbol":"APU-O-0000","period":90}' \
  | jq -r '.requestId')
echo "Historical Request ID: $HIST_REQ"

# 6. Get risk assessment
echo "6. Requesting risk assessment..."
RISK_REQ=$(curl -s -X POST http://localhost:3001/api/agent/risk/assess \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","portfolio":[{"symbol":"APU-O-0000","shares":100,"avgPrice":1000}]}' \
  | jq -r '.requestId')
echo "Risk Request ID: $RISK_REQ"

echo ""
echo "=== All requests sent! Monitor user-responses topic ==="
echo "Run: docker exec thesis-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic user-responses --from-beginning"
```

Save as `test-e2e.sh`, make executable, and run:
```bash
chmod +x test-e2e.sh
./test-e2e.sh
```

---

## 13. Troubleshooting

### API Gateway not starting:
```bash
# Check logs
cd /home/it/apps/thesis-report/backend/api-gateway
npm run dev

# Check port availability
lsof -i :3001

# Check Kafka connection
docker logs thesis-kafka | tail -20
```

### Agent not responding:
```bash
# Check agent logs
tail -50 /tmp/market-analysis.log
tail -50 /tmp/portfolio-advisor.log

# Restart agent
cd /home/it/apps/thesis-report/backend/portfolio-advisor-agent
npm run dev
```

### Kafka issues:
```bash
# Restart Kafka
cd /home/it/apps/thesis-report/backend
docker-compose restart thesis-kafka

# Check topics exist
docker exec thesis-kafka kafka-topics --list --bootstrap-server localhost:9092
```

---

## 14. Success Criteria

### ✅ API Gateway Working:
- [ ] Health endpoint returns 200
- [ ] All routes respond
- [ ] Kafka producer connected
- [ ] No errors in logs

### ✅ Agents Working:
- [ ] All 6 agents running
- [ ] Consuming from correct topics
- [ ] Publishing responses
- [ ] Processing within expected time

### ✅ End-to-End Flow:
- [ ] Request → API Gateway → Kafka → Agent → Response
- [ ] SSE streaming works
- [ ] Response data is correct
- [ ] No message loss

---

## 📊 Expected Response Times

| Agent | Expected Time | Acceptable Range |
|-------|---------------|------------------|
| Orchestrator | 2-3s | 1-5s |
| Portfolio Advisor | 5-8s | 3-10s |
| Market Analysis | 8-10s | 5-15s |
| News Intelligence | 1-2s | 1-5s |
| Historical Analysis | 4-6s | 3-10s |
| Risk Assessment | 4-6s | 3-10s |

---

## 🎓 Demo Scenarios

### Scenario 1: New User Registration
1. Register user via API Gateway
2. Watch Kafka topic for event
3. Welcome Email Agent processes (when implemented)
4. User receives personalized email

### Scenario 2: Investment Advisory
1. User requests portfolio advice
2. API Gateway routes to Portfolio Advisor
3. Agent analyzes MSE data
4. Returns personalized recommendations
5. Frontend displays advice

### Scenario 3: Market Intelligence
1. User views market dashboard
2. Frontend requests market analysis
3. Market Analysis Agent processes
4. Returns trends + insights
5. Frontend displays charts

### Scenario 4: Real-time Updates
1. User sends multiple requests
2. SSE connection established
3. Responses stream in real-time
4. UI updates progressively

---

## 📝 Next Steps After Testing

1. **If all tests pass**: 
   - Update frontend to use API Gateway
   - Build Welcome Email Agent
   - Add daily news integration

2. **If tests fail**:
   - Check error logs
   - Verify Kafka connectivity
   - Ensure all agents are running
   - Check environment variables

3. **Performance optimization**:
   - Add Redis caching
   - Implement connection pooling
   - Optimize database queries
   - Add Apache Flink for aggregation

---

**Status**: 📋 **READY FOR TESTING**  
**All Components**: Built and documented  
**Infrastructure**: Running in Docker  
**Next Action**: Run these tests!

