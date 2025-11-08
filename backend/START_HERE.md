# 🚀 Start Here - Load Your MSE Data

Quick guide to get everything running with your MSE data.

## Step 1: Copy Gemini API Key

```bash
# From backend directory
cd /home/it/apps/thesis-report/backend

# Copy your Gemini key from frontend
cp ../frontend/.env .env

# Or manually edit .env:
# nano .env
# Add: GEMINI_API_KEY=your_key_here
```

## Step 2: Start Docker Services

```bash
# Start all infrastructure
docker-compose up -d

# Wait for services to be ready (important!)
echo "Waiting 30 seconds for services to start..."
sleep 30

# Check all services are running
docker-compose ps
```

**Expected output**: All services should show "Up" or "Up (healthy)"

## Step 3: Create Kafka Topics

```bash
# Make script executable (if not already)
chmod +x infrastructure/kafka/create-topics.sh

# Create all topics
./infrastructure/kafka/create-topics.sh
```

**Expected**: Should see "✓ Successfully created" for each topic

## Step 4: Install MSE Service Dependencies

```bash
cd mse-ingestion-service
npm install
```

## Step 5: Load Your MSE Data

```bash
# Still in mse-ingestion-service directory
npx tsx scripts/load-data.ts
```

**This will**:
- Load 849,795 records from `TradingHistory,json`
- Load 1,307 records from `TradingStatus.json`
- Insert into PostgreSQL
- Stream to Kafka topics
- Show progress updates

**Expected time**: 5-10 minutes for 849K records

## Step 6: Verify Data Loaded

### Check PostgreSQL

```bash
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db

# Inside psql:
SELECT COUNT(*) FROM mse_trading_history;
SELECT COUNT(DISTINCT symbol) FROM mse_trading_history;
SELECT * FROM mse_trading_history ORDER BY trade_date DESC LIMIT 5;
\q
```

### Check Kafka UI

Open http://localhost:8080

- Go to **Topics** → `mse-stock-updates`
- You should see 849,795+ messages!

### Check Trading Status

```bash
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db -c "SELECT * FROM mse_trading_status LIMIT 5;"
```

## Troubleshooting

### "Connection refused" to PostgreSQL

```bash
# Wait longer for PostgreSQL to start
sleep 15

# Or restart
docker-compose restart postgres
sleep 10
```

### "Connection refused" to Kafka

```bash
# Kafka takes ~30 seconds to start
sleep 30

# Or check logs
docker-compose logs kafka
```

### "Duplicate key error"

This is normal if you run the script twice. It will skip duplicate records.

### Script runs out of memory

If loading all 849K records at once is too much:

1. Split the TradingHistory,json file into smaller chunks
2. Or increase Docker memory limit

## What's Next?

Once data is loaded:

1. ✅ Infrastructure running
2. ✅ MSE data in PostgreSQL
3. ✅ Data streaming through Kafka
4. ⏳ Ready to build agents!

**Next step**: Build the Flink Intelligent Router (Week 2)

---

## Quick Commands Reference

```bash
# Start everything
docker-compose up -d
sleep 30
./infrastructure/kafka/create-topics.sh

# Load data
cd mse-ingestion-service
npm install
npx tsx scripts/load-data.ts

# Check PostgreSQL
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db

# Check Kafka UI
open http://localhost:8080

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Stop and remove data (WARNING: deletes everything!)
docker-compose down -v
```

---

## Services & Ports

- **Kafka**: localhost:9092
- **Kafka UI**: http://localhost:8080
- **PostgreSQL**: localhost:5432
- **Flink**: http://localhost:8081
- **Qdrant**: http://localhost:6333
- **Redis**: localhost:6379

---

**Ready to load your data?** Just follow the steps above! 🎉

