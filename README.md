# AI Agents for Microservices - Bachelor Thesis

**Student**: Б.Раднаабазар (22B1NUM0286)  
**Advisor**: Дэд профессор Б.Сувдаа  
**University**: МУИС - Мэдээллийн технологи, электроникийн сургууль  
**Program**: Мэдээллийн технологи (D061304)  
**Year**: 2025

## Project Overview

This repository contains the bachelor thesis research and demonstration application on **"AI Agents for Microservices Architecture"** (Микросервис архитектурт суурилсан хиймэл оюун агентууд).

The project demonstrates how AI agents can be integrated into an Event-Driven microservices architecture using Apache Kafka and Apache Flink for a stock market analysis platform.

## Repository Structure

```
thesis-report/
├── VISION.md              # Detailed vision document
├── PLAN.md               # 6-week implementation plan
├── README.md             # This file
├── report/
│   ├── main.tex          # Thesis LaTeX source
│   ├── src/              # Thesis chapters
│   ├── figures/          # Diagrams and images
│   └── styles/           # LaTeX styles
├── frontend/             # Next.js application
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   └── types/            # TypeScript types
└── backend/              # Microservices (to be created)
    ├── docker-compose.yml
    ├── orchestrator-agent/
    ├── portfolio-agent/
    ├── market-analysis-agent/
    ├── news-agent/
    ├── historical-agent/
    ├── risk-agent/
    └── flink-jobs/
```

## Key Concepts

### AI Agents
- **Orchestrator Agent**: Routes user queries to appropriate agents
- **Portfolio Advisor Agent**: Provides investment recommendations
- **Market Analysis Agent**: Analyzes market trends and patterns
- **News Intelligence Agent**: Processes financial news with sentiment analysis
- **Historical Analysis Agent**: Performs technical analysis on historical data
- **Risk Assessment Agent**: Evaluates portfolio risk and suggests mitigation

### Architecture
- **Event-Driven**: Asynchronous communication via Apache Kafka
- **Microservices**: Independent, scalable services
- **RAG System**: Retrieval-Augmented Generation with vector database
- **Stream Processing**: Real-time analytics with Apache Flink

## Tech Stack

### Backend
- Apache Kafka - Message broker
- Apache Flink - Stream processing
- Node.js/TypeScript - Orchestrator agent
- Python/FastAPI - AI agents
- Qdrant - Vector database
- PostgreSQL - Primary database
- Redis - Caching

### Frontend
- Next.js 14 - React framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- shadcn/ui - Component library
- Recharts - Data visualization

### AI/ML
- OpenAI GPT-3.5/GPT-4 or Anthropic Claude - Large Language Models
- Sentence Transformers - Text embeddings
- FinBERT - Financial sentiment analysis

### APIs
- Finnhub - Stock data
- Alpha Vantage - Market data
- yfinance - Historical data

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for frontend)
- Python 3.10+ (for agents)
- 8GB+ RAM (for running Kafka cluster)

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd thesis-report
```

2. **Set up environment variables**
```bash
# Backend
cp backend/.env.example backend/.env
# Add your API keys: OPENAI_API_KEY, FINNHUB_API_KEY, etc.

# Frontend
cp frontend/.env.example frontend/.env.local
```

3. **Start infrastructure**
```bash
cd backend
docker-compose up -d
```

4. **Start agents**
```bash
# Orchestrator
cd backend/orchestrator-agent
npm install && npm run dev

# Portfolio Agent
cd backend/portfolio-agent
pip install -r requirements.txt
python src/main.py

# Repeat for other agents...
```

5. **Start frontend**
```bash
cd frontend
npm install
npm run dev
```

6. **Access the application**
- Frontend: http://localhost:3000
- Kafka UI: http://localhost:8080
- Qdrant: http://localhost:6333/dashboard

## Current Status

### ✅ Completed
- [x] Thesis theoretical framework
- [x] Frontend base structure
- [x] User authentication
- [x] Watchlist functionality
- [x] Basic news integration (Inngest)

### 🚧 In Progress
- [ ] Backend microservices architecture
- [ ] AI agents implementation
- [ ] Kafka integration
- [ ] Flink stream processing

### 📋 Planned
- [ ] RAG system
- [ ] Advanced agent features
- [ ] Performance evaluation
- [ ] Demo scenarios

See [PLAN.md](PLAN.md) for detailed timeline and [VISION.md](VISION.md) for complete vision.

## Demo Scenarios

### 1. Portfolio Rebalancing
**User Query**: "Should I rebalance my portfolio?"

**System Flow**:
1. User sends query via frontend
2. Message published to Kafka `user-requests` topic
3. Orchestrator Agent classifies intent as "portfolio_advice"
4. Routes to Portfolio Advisor Agent
5. Portfolio Agent:
   - Fetches user portfolio from database
   - Queries Market Analysis Agent for trends
   - Queries Risk Agent for assessment
   - Uses RAG to retrieve relevant insights
   - Generates recommendation with LLM
6. Response flows back through Kafka
7. Frontend displays recommendation with citations

**Expected Output**: Personalized rebalancing strategy with reasoning and action items

### 2. Market Trends Analysis
**User Query**: "What are the current market trends?"

**System Flow**:
1. Orchestrator routes to Market Analysis Agent
2. Agent queries Flink for real-time technical indicators
3. LLM interprets data and generates narrative
4. Response includes sector analysis, momentum, and signals

### 3. System Resilience Demo
**Action**: Kill Portfolio Agent container

**Expected Behavior**:
- Other agents continue functioning
- Kafka retains unprocessed messages
- Portfolio Agent restarts and resumes from last offset
- No data loss

## Evaluation Metrics

The thesis evaluates the system on multiple dimensions:

### Agent Performance
- Response accuracy vs expert analysis
- Latency (p50, p95, p99)
- Token usage and cost efficiency
- Hallucination rate

### System Performance
- Throughput (requests per second)
- Scalability (performance under load)
- Fault tolerance
- Message latency

### Comparison with Monolith
- Deployment flexibility
- Horizontal scalability
- Fault isolation
- Development velocity
- Operational complexity
- Cost at scale

See evaluation chapter in thesis for detailed results.

## Key Features

### Personalized AI Insights
- Tailored recommendations based on user profile
- Risk-aware portfolio advice
- Market trend interpretation
- Historical pattern analysis

### Real-Time Processing
- Live market data streaming
- Immediate sentiment analysis on news
- Dynamic risk calculations
- Technical indicator updates

### Event-Driven Architecture
- Loose coupling between agents
- Independent scalability
- Fault isolation
- Message replay capability

### RAG-Powered Knowledge
- Grounded AI responses
- Reduced hallucinations
- Citation of sources
- Contextual relevance

## Development Guidelines

### Adding a New Agent

1. Create agent directory: `backend/my-agent/`
2. Define Kafka topics in `infrastructure/kafka/topics.sh`
3. Implement consumer and producer
4. Add agent logic and LLM integration
5. Dockerize the service
6. Update `docker-compose.yml`
7. Test end-to-end flow

### Modifying Kafka Topics

1. Update topic definition in creation script
2. Update Avro schema if needed
3. Update producers and consumers
4. Test message flow with Kafka UI

### Frontend Development

1. Create UI components in `components/`
2. Add API routes for Kafka interaction
3. Implement SSE for real-time updates
4. Test with mock Kafka responses first

## Testing

### Unit Tests
```bash
# Backend agents
cd backend/portfolio-agent
pytest tests/

# Frontend
cd frontend
npm test
```

### Integration Tests
```bash
# Start all services
docker-compose up -d

# Run integration tests
cd backend/tests
python integration_tests.py
```

### Load Tests
```bash
# Install Locust
pip install locust

# Run load test
cd load_test
locust -f locustfile.py --host=http://localhost:3000
```

## Deployment

### Local (Docker Compose)
```bash
cd backend
docker-compose up -d
```

### Cloud (Kubernetes) - Future
```bash
kubectl apply -f k8s/
```

## Monitoring

### Kafka UI
- View topics, messages, consumer lag
- URL: http://localhost:8080

### Prometheus + Grafana (Optional)
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

## Troubleshooting

### Kafka Connection Issues
```bash
# Check Kafka is running
docker ps | grep kafka

# Test connection
kafka-topics --bootstrap-server localhost:9092 --list
```

### Agent Not Consuming Messages
```bash
# Check consumer group lag
kafka-consumer-groups --bootstrap-server localhost:9092 --describe --group portfolio-agent-group

# Reset offsets if needed
kafka-consumer-groups --bootstrap-server localhost:9092 --group portfolio-agent-group --reset-offsets --to-earliest --execute --topic portfolio-tasks
```

### LLM API Errors
- Check API key is set in `.env`
- Verify API quota/credits
- Check network connectivity

## Contributing

This is a thesis project, but suggestions are welcome:

1. Fork the repository
2. Create feature branch
3. Make changes
4. Submit pull request with description

## Documentation

- [VISION.md](VISION.md) - Detailed vision and architecture
- [PLAN.md](PLAN.md) - Implementation plan and timeline
- [report/main.tex](report/main.tex) - Thesis document (Mongolian)
- API docs - Coming soon (Swagger/OpenAPI)

## License

This project is for academic purposes (Bachelor thesis).

## Contact

**Student**: Б.Раднаабазар  
**Email**: radnaabazar.bulgany@gmail.com  
**University**: МУИС  

## Acknowledgments

- Thesis Advisor: Дэд профессор Б.Сувдаа
- МУИС - Мэдээллийн технологи, электроникийн сургууль
- Apache Kafka & Flink communities
- OpenAI & Anthropic for LLM APIs

## References

Key papers and resources used in this thesis:

1. Huyen, Chip. *AI Engineering*. O'Reilly Media, 2024.
2. Newman, Sam. *Building Microservices*. O'Reilly Media, 2015.
3. Apache Kafka Documentation
4. Apache Flink Documentation
5. OpenAI API Reference

See thesis bibliography for complete list.

---

**Last Updated**: 2025-11-07  
**Thesis Defense**: TBD (2025-10)  
**Status**: 🚧 In Development
