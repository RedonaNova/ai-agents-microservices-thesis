# MSE Ingestion Service

Ingests MSE (Mongolian Stock Exchange) trading data into PostgreSQL and streams to Kafka for real-time processing.

## Features

- ✅ Fetch data from MSE API (if available)
- ✅ Load data from JSON files
- ✅ Store in PostgreSQL for historical queries
- ✅ Stream to Kafka for real-time processing
- ✅ Batch processing for large datasets
- ✅ Automatic company upsert
- ✅ Real-time trading status updates
- ✅ Monitoring events

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` in the backend root or set these variables:

```env
# Required
DATABASE_URL=postgresql://thesis_user:thesis_pass@localhost:5432/thesis_db
KAFKA_BROKER=localhost:9092

# Optional (if you have API access)
MSE_API_URL=https://your-mse-api-endpoint
MSE_API_KEY=your_api_key

# Optional (defaults)
MSE_POLLING_INTERVAL_MS=60000  # 1 minute
LOG_LEVEL=info
```

### 3. Ensure Infrastructure is Running

```bash
# From backend/
docker-compose up -d postgres kafka
```

## Usage

### Option 1: Run with Real-time API Polling

If you have MSE API access:

```bash
npm run dev
```

The service will:
1. Connect to PostgreSQL and Kafka
2. Check if MSE API is available
3. Start polling for real-time data every minute
4. Store in database and stream to Kafka

### Option 2: Load from JSON File

If you have MSE data in a JSON file:

1. Place your JSON file somewhere (e.g., `data/mse-trading-history.json`)

2. Your JSON should be in this format:

```json
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
  },
  ...
]
```

3. Start the service:

```bash
npm run dev
```

4. In another terminal, use the API endpoint or Node.js REPL:

```typescript
// Using Node.js REPL
import service from './dist/index.js';

// Load from file
await service.loadFromFile('/path/to/your/mse-data.json');
```

Or create a quick script:

```typescript
// scripts/load-data.ts
import service from '../src/index';

async function main() {
  await service.start();
  await service.loadFromFile('./data/mse-trading-history.json');
  await service.stop();
}

main();
```

### Option 3: Load Historical Date Range

```typescript
// Load data for a specific date range
await service.loadHistoricalData('2024-01-01', '2024-12-31');
```

## Data Flow

```
MSE API / JSON File
        ↓
   MSE Ingestion Service
        ↓
    ┌───┴───┐
    ↓       ↓
PostgreSQL  Kafka (mse-stock-updates)
    ↓       ↓
Agents Query  Flink Processing
```

## API Endpoints

If you add an Express server (optional):

```typescript
// GET /health - Health check
// POST /ingest/file - Upload JSON file
// GET /stats - Ingestion statistics
```

## Database Tables

### mse_companies
- Stores company information
- Auto-upserted when new companies appear in trading data

### mse_trading_history
- Historical trading data
- Indexed by symbol and date for fast queries

### mse_trading_status
- Real-time trading status
- Updated continuously
- Upserted by symbol (UNIQUE constraint)

## Kafka Topics

### Published To:

- `mse-stock-updates` - Real-time price updates
- `mse-trading-history` - Historical data records
- `monitoring-events` - Service monitoring events

### Message Format:

```typescript
{
  symbol: "KHAN-O-0000",
  price: 1318,
  volume: 45861,
  timestamp: 1699286160000,
  market: "MSE",
  metadata: {
    high: 1343,
    low: 1308,
    open: 1341,
    previousClose: 1321,
    changePercent: -0.23
  }
}
```

## Monitoring

### Logs

```bash
# View logs
docker-compose logs -f mse-ingestion-service  # if dockerized

# Or if running locally
npm run dev  # logs to console
```

### Kafka UI

Visit http://localhost:8080 to see:
- Messages being published to `mse-stock-updates`
- Topic throughput
- Consumer lag (if any)

### Database Queries

```sql
-- Check latest data
SELECT * FROM mse_trading_history 
ORDER BY trade_date DESC 
LIMIT 10;

-- Check companies
SELECT * FROM mse_companies;

-- Check real-time status
SELECT * FROM mse_trading_status
ORDER BY updated_at DESC;

-- Get ingestion statistics
SELECT 
  COUNT(*) as total_records,
  MIN(trade_date) as earliest_date,
  MAX(trade_date) as latest_date,
  COUNT(DISTINCT symbol) as unique_symbols
FROM mse_trading_history;
```

## Troubleshooting

### "Connection refused" to PostgreSQL

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

### "Connection refused" to Kafka

```bash
# Check if Kafka is running
docker-compose ps kafka

# Wait for Kafka to be ready (takes 30 seconds)
sleep 30

# Test connection
docker exec thesis-kafka kafka-broker-api-versions --bootstrap-server localhost:9092
```

### "File not found" error

- Ensure the file path is absolute or relative to where you run the command
- Check file permissions (should be readable)

### Data not appearing in Kafka

- Check Kafka UI at http://localhost:8080
- Verify topic exists: `docker exec thesis-kafka kafka-topics --list --bootstrap-server localhost:9092`
- Check consumer lag

### Duplicate key errors

- The service uses `ON CONFLICT DO NOTHING` for trading history
- This is normal if you re-ingest the same data
- Check the `id` field is unique in your source data

## Performance

- **Batch size**: 100 records per batch (configurable)
- **Polling interval**: 60 seconds (configurable via `MSE_POLLING_INTERVAL_MS`)
- **Database**: Uses connection pooling (20 max connections)
- **Kafka**: Uses batch sending for efficiency

## Development

### Build

```bash
npm run build
```

### Run in Production

```bash
npm start
```

### Docker (Optional)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["npm", "start"]
```

## Next Steps

1. ✅ Start the service
2. ⏳ Load your MSE data
3. ⏳ Verify data in PostgreSQL
4. ⏳ Check Kafka messages
5. ⏳ Connect agents to consume the data

See main [backend README](../README.md) for full architecture.

