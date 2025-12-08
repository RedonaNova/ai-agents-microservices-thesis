# Backend - AI Agents Microservices

> For full project documentation, see [../README.md](../README.md)

---

## Architecture

```
┌─────────────────┐
│ API Gateway     │ ← Express.js, JWT Auth, Kafka Producer
└────────┬────────┘
         │ Kafka Events
┌────────▼────────────────────────────────────────┐
│         Apache Kafka (Event Broker)             │
└───┬──────┬──────┬──────┬──────┬─────────────────┘
    │      │      │      │      │
┌───▼───┐┌─▼───┐┌─▼───┐┌─▼───┐┌▼──────────┐
│Orches-││Know-││Inve-││News ││PyFlink    │
│trator ││ledge││stment││Agent││Planner    │
│Agent  ││Agent││Agent││     ││           │
└───────┘└─────┘└─────┘└─────┘└───────────┘
```

## Quick Start

```bash
# From project root
./start-all-services.sh
```

This starts:
1. **Infrastructure**: Kafka, PostgreSQL, Redis, Zookeeper
2. **Agents**: Orchestrator, Investment, News, Knowledge, PyFlink
3. **API Gateway**: http://localhost:3001
4. **Kafka UI**: http://localhost:8080

## Services

| Service | Port | Technology |
|---------|------|------------|
| API Gateway | 3001 | Express.js |
| Kafka | 9092 | Apache Kafka 3.5 |
| Kafka UI | 8080 | Provectuslabs |
| PostgreSQL | 5432 | PostgreSQL 16 |
| Redis | 6379 | Redis 7 |
| Zookeeper | 2181 | Zookeeper 3.8 |

## Project Structure

```
backend/
├── api-gateway/           # Express.js API Gateway
├── orchestrator-agent/    # Central coordinator (ReAct)
├── investment-agent/      # MSE analysis + Gemini AI
├── news-agent/            # Finnhub + Sentiment
├── knowledge-agent/       # RAG system + pgvector
├── flink-planner/         # PyFlink multi-step
├── database/              # PostgreSQL schema
├── kafka/                 # Topic creation scripts
└── docker-compose.yml     # Infrastructure
```

## Kafka Topics

```
user.requests       → Orchestrator input
agent.tasks         → Agent task dispatch
agent.responses     → Agent outputs
planning.tasks      → Complex tasks → Flink
planning.results    → Flink outputs
knowledge.queries   → RAG queries
knowledge.results   → RAG results
```

## Environment Variables

```bash
# Copy and edit
cp env.example .env

# Required
GEMINI_API_KEY=your_key_here

# Optional
FINNHUB_API_KEY=your_key_here
RESEND_API_KEY=your_key_here
```

## Development

### Individual Services

```bash
# API Gateway
cd api-gateway && npm run dev

# Orchestrator Agent
cd orchestrator-agent && npm run dev

# Investment Agent
cd investment-agent && npm run dev

# News Agent
cd news-agent && npm run dev

# Knowledge Agent
cd knowledge-agent && npm run dev

# PyFlink Planner
cd flink-planner
source venv/bin/activate
python planner_job.py
```

### Database Access

```bash
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db
```

### Kafka Debugging

```bash
# List topics
docker exec thesis-kafka kafka-topics --list --bootstrap-server localhost:9092

# Consume messages
docker exec thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic agent.responses \
  --from-beginning
```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register user
- `POST /api/users/login` - Login
- `GET /api/users/profile` - Get profile

### Watchlist
- `GET /api/watchlist` - Get watchlists
- `POST /api/watchlist/:id/items` - Add stock
- `DELETE /api/watchlist/:id/items/:symbol` - Remove stock

### AI Agents
- `POST /api/agent/query` - Submit query
- `GET /api/agent/response/:id` - Get response
- `POST /api/agent/analyze-watchlist` - Analyze watchlist

### MSE Data
- `GET /api/mse/companies` - List companies
- `GET /api/mse/trading-status` - Current prices
- `GET /api/mse/history/:symbol` - Price history

## Documentation

- [Main README](../README.md) - Full documentation
- [Performance](../PERFORMANCE.md) - Metrics
- [Vision](../VISION.md) - Architecture
- [Demo Guide](../DEMO_PRESENTATION.md) - Thesis demo

---

**Built for Bachelor Thesis - MUIS, MTES, 2025**
