# Quick Start Guide - Phase 1 Complete! 🎉

You now have the complete infrastructure setup. Here's how to get started.

## What We've Created

✅ Docker Compose with all services  
✅ PostgreSQL schema with MSE tables  
✅ Kafka topics creation script  
✅ MSE Ingestion Service (Node.js)  
✅ Complete documentation  

## Step-by-Step: Start Everything

### 1. Copy Your Gemini API Key

```bash
# Copy from your frontend .env
cd frontend
cat .env | grep GEMINI

# Create backend .env
cd ../backend
cp env.example .env

# Edit .env and paste your GEMINI_API_KEY
nano .env  # or use your editor
```

### 2. Start Infrastructure

```bash
# From backend/ directory
docker-compose up -d

# Wait for services to be healthy (30 seconds)
sleep 30

# Check all services are running
docker-compose ps
```

**Expected Output**:
```
NAME                     STATUS
thesis-flink-jobmanager  Up
thesis-flink-taskmanager Up
thesis-kafka             Up (healthy)
thesis-kafka-ui          Up
thesis-postgres          Up (healthy)
thesis-qdrant            Up (healthy)
thesis-redis             Up (healthy)
thesis-zookeeper         Up
```

### 3. Create Kafka Topics

```bash
./infrastructure/kafka/create-topics.sh
```

**Expected**: 15+ topics created

### 4. Verify Services

**Kafka UI**: http://localhost:8080  
**Flink Dashboard**: http://localhost:8081  
**Qdrant Dashboard**: http://localhost:6333/dashboard  

### 5. Prepare Your MSE Data

You mentioned you have MSE data in 3 tables. Create a JSON file:

```json
// data/mse-sample.json
[
  {
    "id": 172446,
    "Symbol": "KHAN-O-0000",
    "Name": "Khan Bank",
    "OpeningPrice": 1341,
    "ClosingPrice": 1318,
    "HighPrice": 1343,
    "LowPrice": 1308,
    "Volume": 45861,
    "PreviousClose": 1321,
    "Turnover": 60565904,
    "MDEntryTime": "2025-11-06T17:16:00.000Z",
    "companycode": 563,
    "MarketSegmentID": "I classification",
    "securityType": "CS",
    "dates": "2025-11-07"
  }
]
```

### 6. Install MSE Ingestion Service

```bash
cd mse-ingestion-service
npm install
```

### 7. Start MSE Ingestion Service

```bash
# Terminal 1: Start the service
npm run dev
```

### 8. Load Your MSE Data

**Option A: From JSON file**

Create a load script:

```typescript
// scripts/load-mse-data.ts
import service from '../src/index';
import path from 'path';

async function main() {
  // Service auto-starts, just load data
  const dataPath = path.join(__dirname, '../../data/mse-sample.json');
  await service.loadFromFile(dataPath);
  console.log('✓ Data loaded successfully!');
}

main().catch(console.error);
```

Run it:
```bash
npx tsx scripts/load-mse-data.ts
```

**Option B: If you have API access**

Just set `MSE_API_URL` in `.env` and the service will auto-poll.

### 9. Verify Data Ingestion

**Check PostgreSQL**:
```bash
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db

# Inside psql:
SELECT COUNT(*) FROM mse_trading_history;
SELECT * FROM mse_trading_history LIMIT 5;
SELECT * FROM mse_companies;
```

**Check Kafka**:
- Open http://localhost:8080
- Go to Topics → `mse-stock-updates`
- You should see messages!

### 10. Test End-to-End Flow

**Terminal 2: Subscribe to Kafka topic**
```bash
docker exec -it thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic mse-stock-updates \
  --from-beginning
```

You should see messages like:
```json
{
  "symbol":"KHAN-O-0000",
  "price":1318,
  "volume":45861,
  ...
}
```

## What's Next?

### Phase 1 Complete ✅

- [x] Docker infrastructure running
- [x] Kafka topics created
- [x] PostgreSQL schema applied
- [x] MSE data ingestion working
- [x] Data flowing through Kafka

### Phase 2: Start Building Agents (Week 2)

Now you can build the first agent! Next steps:

1. **Flink Intelligent Router** (Python)
   - Uses Gemini to route user queries
   - Determines which agent should handle what
   
2. **Portfolio Agent** (Node.js)
   - Analyzes user portfolio
   - Gives recommendations
   - Uses MSE data from PostgreSQL

3. **Test End-to-End**
   - User query → Kafka → Flink → Agent → Response

See [PLAN_REVISED.md](../PLAN_REVISED.md) for detailed next steps.

## Troubleshooting

### Services Won't Start

```bash
# Stop everything
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Start fresh
docker-compose up -d
```

### Port Already in Use

```bash
# Find what's using the port
lsof -ti:9092  # for Kafka
lsof -ti:5432  # for PostgreSQL

# Kill the process
kill -9 $(lsof -ti:9092)
```

### Kafka Topics Not Created

```bash
# Manually create a topic
docker exec thesis-kafka kafka-topics \
  --create \
  --bootstrap-server localhost:9092 \
  --topic test-topic \
  --partitions 1 \
  --replication-factor 1
```

### MSE Service Can't Connect

```bash
# Check .env file exists
ls -la .env

# Check DATABASE_URL and KAFKA_BROKER are set
cat .env | grep DATABASE_URL
cat .env | grep KAFKA_BROKER

# Test PostgreSQL connection
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db -c "SELECT 1;"
```

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     YOU ARE HERE                            │
│              Phase 1: Infrastructure ✅                     │
└─────────────────────────────────────────────────────────────┘

Frontend (Next.js)
    ↓
[TO BE BUILT: Kafka Producer]
    ↓
Apache Kafka ✅
    ↓
[TO BE BUILT: Flink Intelligent Router]
    ↓
Kafka Topics ✅
    ↓
[TO BE BUILT: Node.js Agents]
    ↓
PostgreSQL ✅ + Qdrant ✅
    ↓
Response back through Kafka
```

## Commands Reference

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart [service-name]

# Check service health
docker-compose ps

# Access PostgreSQL
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db

# List Kafka topics
docker exec thesis-kafka kafka-topics --list --bootstrap-server localhost:9092

# Consume from topic
docker exec -it thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic [topic-name] \
  --from-beginning

# View Kafka UI
open http://localhost:8080

# View Flink Dashboard
open http://localhost:8081
```

## Next Session

When you're ready to continue:

1. ✅ Verify infrastructure is running
2. ⏳ Build Flink Intelligent Router
3. ⏳ Build Portfolio Agent
4. ⏳ Test with real queries

---

**Status**: 🎉 Phase 1 Complete!  
**Next**: Phase 2 - Build AI Agents  
**Timeline**: On track for 6-week completion  

Great progress! 🚀

