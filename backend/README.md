# Backend - AI Agents for Microservices

Event-driven AI agent system for stock market analysis using Apache Kafka and Flink.

## Architecture

```
User → Kafka → Flink (Intelligent Router) → Node.js Agents → Kafka → Response
```

## Quick Start

### 1. Prerequisites

- Docker & Docker Compose
- Node.js 18+ and npm
- Python 3.10+ (for Flink jobs)
- Gemini API Key

### 2. Setup Environment

```bash
# Copy environment template
cp env.example .env

# Edit .env and add your keys:
# - GEMINI_API_KEY (from your frontend .env or get from Google AI Studio)
# - MSE_API_URL (if you have API access)
```

### 3. Start Infrastructure

```bash
# Start all services (Kafka, Flink, PostgreSQL, Qdrant, Redis)
docker-compose up -d

# Check all services are healthy
docker-compose ps
```

**Services will be available at**:
- Kafka: `localhost:9092`
- Kafka UI: http://localhost:8080
- Flink Dashboard: http://localhost:8081
- PostgreSQL: `localhost:5432`
- Qdrant: http://localhost:6333
- Redis: `localhost:6379`

### 4. Create Kafka Topics

```bash
# Wait for Kafka to be ready (30 seconds)
sleep 30

# Create all topics
./infrastructure/kafka/create-topics.sh

# Verify topics created
docker exec thesis-kafka kafka-topics --list --bootstrap-server localhost:9092
```

### 5. Initialize Database

The PostgreSQL schema will be automatically applied on first startup from `infrastructure/postgres/01_schema.sql`.

**Verify database**:
```bash
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db -c "\dt"
```

### 6. Install Dependencies

```bash
# Install shared dependencies
cd shared && npm install && cd ..

# Install MSE ingestion service
cd mse-ingestion-service && npm install && cd ..

# (Repeat for other services as you create them)
```

### 7. Start MSE Ingestion Service

```bash
cd mse-ingestion-service
npm run dev
```

This will:
- Connect to your MSE API (or load from CSV)
- Parse trading data
- Store in PostgreSQL
- Stream to Kafka topics

## Project Structure

```
backend/
├── docker-compose.yml          # All infrastructure services
├── env.example                 # Environment template
│
├── flink-jobs/                 # Apache Flink jobs (Python)
│   ├── intelligent_router.py   # Routes requests with Gemini
│   ├── agent_memory.py         # Stateful agent context
│   ├── mse_analytics.py        # MSE stream processing
│   └── response_aggregator.py  # Combines multi-agent responses
│
├── shared/                     # Shared Node.js utilities
│   ├── base-agent.ts           # Base class for all agents
│   ├── kafka-client.ts         # Kafka utilities
│   ├── gemini-client.ts        # Gemini API wrapper
│   └── database.ts             # PostgreSQL client
│
├── mse-ingestion-service/      # MSE data ingestion (Node.js)
│   ├── src/
│   │   ├── index.ts
│   │   ├── api-client.ts
│   │   ├── csv-parser.ts
│   │   └── kafka-producer.ts
│   └── package.json
│
├── portfolio-agent/            # Portfolio analysis agent
├── market-analysis-agent/      # Market trend analysis
├── news-agent/                 # News intelligence
├── historical-agent/           # Historical analysis
├── risk-agent/                 # Risk assessment
└── rag-service/                # RAG system

└── infrastructure/
    ├── kafka/
    │   └── create-topics.sh
    └── postgres/
        └── 01_schema.sql
```

## MSE Data Flow

1. **Ingestion**: MSE data → PostgreSQL + Kafka `mse-stock-updates`
2. **Processing**: Flink jobs process real-time data
3. **Storage**: Historical data in PostgreSQL, real-time in Kafka
4. **Access**: Agents query from both sources

## Kafka Topics

### User Interaction
- `user-requests` - User queries from frontend
- `user-responses` - Final responses to users

### Agent Communication
- `portfolio-tasks` / `portfolio-responses`
- `market-analysis-tasks` / `market-analysis-responses`
- `news-tasks` / `news-responses`
- `historical-tasks` / `historical-responses`
- `risk-tasks` / `risk-responses`

### MSE Data Streams
- `mse-stock-updates` - Real-time price updates
- `mse-trading-history` - Historical data
- `mse-news-events` - MSE-related news

### System
- `monitoring-events` - System logs
- `agent-health` - Agent health checks

## Development

### Running Individual Services

```bash
# MSE Ingestion
cd mse-ingestion-service
npm run dev

# Portfolio Agent
cd portfolio-agent
npm run dev

# (Start other agents as needed)
```

### Monitoring

**Kafka UI**: http://localhost:8080
- View all topics
- See messages in real-time
- Monitor consumer lag

**Flink Dashboard**: http://localhost:8081
- View running jobs
- Monitor job performance
- Check task metrics

### Debugging

**View Kafka messages**:
```bash
# Subscribe to a topic
docker exec -it thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-requests \
  --from-beginning
```

**View PostgreSQL data**:
```bash
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db

# Inside psql:
\dt                          # List tables
SELECT * FROM mse_trading_history LIMIT 10;
SELECT * FROM agent_interactions ORDER BY created_at DESC LIMIT 10;
```

**View logs**:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f kafka
docker-compose logs -f flink-jobmanager
```

## Testing

### Test Kafka Flow

```bash
# Terminal 1: Subscribe to responses
docker exec -it thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-responses

# Terminal 2: Send test request
docker exec -it thesis-kafka kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic user-requests

# Then type:
{"correlationId":"test-123","userId":"test-user","query":"Should I buy AAPL?"}
```

### Test Database

```bash
# Insert test user
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db -c "
  INSERT INTO users (email, name, risk_tolerance) 
  VALUES ('test@example.com', 'Test User', 'moderate');
"

# Query
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db -c "
  SELECT * FROM users;
"
```

## Troubleshooting

### Kafka not starting
```bash
# Check logs
docker-compose logs kafka

# Restart
docker-compose restart kafka zookeeper
```

### PostgreSQL connection refused
```bash
# Check if running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

### Port already in use
```bash
# Find process using port (e.g., 9092)
lsof -ti:9092

# Kill process
kill -9 $(lsof -ti:9092)

# Or change port in docker-compose.yml
```

### Flink job not starting
```bash
# Check Flink logs
docker-compose logs flink-jobmanager
docker-compose logs flink-taskmanager

# Restart Flink
docker-compose restart flink-jobmanager flink-taskmanager
```

## Cleanup

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Next Steps

1. ✅ Infrastructure running
2. ⏳ Implement Flink Intelligent Router
3. ⏳ Create Portfolio Agent
4. ⏳ Test end-to-end flow
5. ⏳ Add more agents

See [PLAN_REVISED.md](../PLAN_REVISED.md) for full implementation plan.

## Resources

- [Apache Kafka Docs](https://kafka.apache.org/documentation/)
- [Apache Flink Docs](https://flink.apache.org/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Qdrant Docs](https://qdrant.tech/documentation/)

