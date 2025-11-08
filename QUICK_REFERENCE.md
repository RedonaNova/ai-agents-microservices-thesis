# Quick Reference - AI Agent System

## 🚀 Start All Services

```bash
# 1. Start Infrastructure
cd /home/it/apps/thesis-report/backend
docker-compose up -d

# 2. Check infrastructure is running
docker ps

# 3. Start agents (6 separate terminals)
cd backend/orchestrator-agent && export KAFKAJS_NO_PARTITIONER_WARNING=1 && npm run dev
cd backend/portfolio-advisor-agent && export KAFKAJS_NO_PARTITIONER_WARNING=1 && npm run dev
cd backend/market-analysis-agent && export KAFKAJS_NO_PARTITIONER_WARNING=1 && npm run dev
cd backend/news-intelligence-agent && export KAFKAJS_NO_PARTITIONER_WARNING=1 && npm run dev
cd backend/historical-analysis-agent && export KAFKAJS_NO_PARTITIONER_WARNING=1 && npm run dev
cd backend/risk-assessment-agent && export KAFKAJS_NO_PARTITIONER_WARNING=1 && npm run dev
```

## 📊 System Status

```bash
# Check all agents running
ps aux | grep "tsx watch" | grep -v grep

# View agent logs
tail -f /tmp/market-analysis.log
tail -f /tmp/news-intelligence.log
tail -f /tmp/historical-analysis.log
tail -f /tmp/risk-assessment.log

# Check Kafka topics
docker exec thesis-kafka kafka-topics --list --bootstrap-server localhost:9092

# Check database
docker exec thesis-postgres psql -U thesis_user -d thesis_db -c "SELECT COUNT(*) FROM mse_trading_history;"
```

## 🧪 Test Each Agent

### Portfolio Advisor
```bash
echo '{"requestId":"test-001","userId":"user123","intent":"portfolio_advice","message":"I want to invest 5M MNT","metadata":{"investmentAmount":5000000,"riskTolerance":"moderate"},"timestamp":"2025-11-08T00:00:00.000Z"}' | docker exec -i thesis-kafka kafka-console-producer --bootstrap-server localhost:9092 --topic portfolio-events
```

### Market Analysis
```bash
echo '{"requestId":"test-002","userId":"user123","intent":"market_analysis","message":"Show market trends","timestamp":"2025-11-08T00:00:00.000Z"}' | docker exec -i thesis-kafka kafka-console-producer --bootstrap-server localhost:9092 --topic market-analysis-events
```

### News Intelligence
```bash
echo '{"requestId":"test-003","userId":"user123","intent":"news_query","message":"Get latest news","timestamp":"2025-11-08T00:00:00.000Z"}' | docker exec -i thesis-kafka kafka-console-producer --bootstrap-server localhost:9092 --topic news-events
```

### Historical Analysis
```bash
echo '{"requestId":"test-004","userId":"user123","intent":"historical_analysis","message":"Analyze APU-O-0000","metadata":{"symbol":"APU-O-0000","period":90},"timestamp":"2025-11-08T00:00:00.000Z"}' | docker exec -i thesis-kafka kafka-console-producer --bootstrap-server localhost:9092 --topic market-analysis-events
```

### Risk Assessment
```bash
echo '{"requestId":"test-005","userId":"user123","intent":"risk_assessment","message":"Assess portfolio risk","timestamp":"2025-11-08T00:00:00.000Z"}' | docker exec -i thesis-kafka kafka-console-producer --bootstrap-server localhost:9092 --topic risk-assessment-events
```

## 👀 Check Responses

```bash
# View all responses
docker exec thesis-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic user-responses --from-beginning

# View latest response (pretty printed)
docker exec thesis-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic user-responses --from-beginning --max-messages 1 --timeout-ms 3000 2>/dev/null | tail -1 | jq '.'
```

## 📁 Key Files

### Documentation
- `ALL_SIX_AGENTS_COMPLETE.md` - Complete system overview
- `AGENTS_PROGRESS_SUMMARY.md` - Detailed progress
- `README.md` - Project overview
- `VISION.md` - Architecture & goals

### Configuration
- `backend/.env` - Environment variables
- `backend/docker-compose.yml` - Infrastructure setup
- Each agent: `package.json`, `tsconfig.json`

### Agent Locations
- `/backend/orchestrator-agent`
- `/backend/portfolio-advisor-agent`
- `/backend/market-analysis-agent`
- `/backend/news-intelligence-agent`
- `/backend/historical-analysis-agent`
- `/backend/risk-assessment-agent`

## 🔧 Troubleshooting

### Agent won't start
```bash
# Check logs
tail -50 /tmp/[agent-name].log

# Check environment variables
cat backend/.env

# Check port conflicts
lsof -i :9092
```

### Kafka connection issues
```bash
# Restart Kafka
cd backend && docker-compose restart thesis-kafka

# Check Kafka is running
docker logs thesis-kafka
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker logs thesis-postgres

# Test connection
docker exec thesis-postgres psql -U thesis_user -d thesis_db -c "SELECT 1;"
```

## 📊 Agent Summary

| Agent | Topic | Response Time | Status |
|-------|-------|---------------|--------|
| Orchestrator | user-requests | ~2-3s | ✅ |
| Portfolio Advisor | portfolio-events | ~5-8s | ✅ |
| Market Analysis | market-analysis-events | ~8-10s | ✅ |
| News Intelligence | news-events | ~1-2s | ✅ |
| Historical Analysis | market-analysis-events | ~4-6s | ✅ |
| Risk Assessment | risk-assessment-events | ~4-6s | ✅ |

## 🎯 Demo Flow

1. **Start infrastructure** (Docker Compose)
2. **Start all 6 agents** (separate terminals)
3. **Send test request** to Orchestrator
4. **Watch routing** in Orchestrator logs
5. **Monitor processing** in specialized agent logs
6. **Check response** in user-responses topic

## 💾 Backup Commands

```bash
# Backup database
docker exec thesis-postgres pg_dump -U thesis_user thesis_db > backup.sql

# Export Kafka topics
docker exec thesis-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic user-responses --from-beginning --max-messages 1000 > responses_backup.json

# Save all logs
tail -1000 /tmp/*.log > all_logs_backup.txt
```

## 🔑 Environment Variables

Required in `backend/.env`:
```bash
KAFKA_BROKER=localhost:9092
DATABASE_URL=postgresql://thesis_user:thesis_pass@localhost:5432/thesis_db
GEMINI_API_KEY=your-gemini-api-key
```

## 📈 Performance Tips

1. **Increase Kafka partitions** for higher throughput
2. **Add database indexes** for faster queries
3. **Scale agents horizontally** (multiple instances per agent)
4. **Enable Redis caching** for frequently accessed data
5. **Use connection pooling** for database (already configured)

## 🎓 Thesis Metrics

- **Total Agents**: 6
- **Lines of Code**: ~4,500+
- **Test Success Rate**: 100%
- **Response Time**: 1-10s (agent dependent)
- **Database Records**: 10,000+
- **Architecture Patterns**: 5 (EDA, Microservices, AI Agents, etc.)

---

**Quick Help**: For detailed agent info, see `/backend/[agent-name]/README.md`  
**Full Status**: See `ALL_SIX_AGENTS_COMPLETE.md`

