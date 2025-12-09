# AI Agents for Microservices

**Микросервис архитектурт суурилсан хиймэл оюун агентууд**

> Bachelor Thesis Project - National University of Mongolia, School of Information Technology and Electronics  
> Author: B.Radnaabazar (22B1NUM0286)  
> Supervisor: Associate Professor B.Suvdaa  
> December 2025

---

## Overview

This project demonstrates an **Event-Driven AI Agent Architecture** that combines microservices design patterns with AI agents for intelligent financial analysis. The system analyzes Mongolian Stock Exchange (MSE) data and provides personalized investment advice in Mongolian language.

### Key Innovation

Traditional multi-agent systems suffer from **N×M coupling complexity** when agents communicate directly via API/gRPC. This project solves this by implementing an **Event-Driven Architecture (EDA)** using Apache Kafka, reducing complexity to **N+M** and enabling:

- **Decoupled agents** that can fail independently
- **Horizontal scaling** by adding more agent instances
- **Event replay** for debugging and model retraining
- **Real-time streaming** with Apache Flink

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND                                       │
│                          Next.js 15 + React 19                                   │
│            Dashboard │ AI Chat │ Watchlist │ MSE Stocks │ Analytics              │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                   HTTP/REST
                                        │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               API GATEWAY                                        │
│                    Express.js │ JWT Auth │ Kafka Producer                        │
│        /api/users │ /api/watchlist │ /api/agent │ /api/mse │ /api/monitoring    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                               Kafka Events (EDA)
                                        │
┌───────────────────────────────────────┴───────────────────────────────────────────┐
│                           APACHE KAFKA (Event Broker)                             │
│   Topics: user.requests │ agent.tasks │ agent.responses │ planning.tasks          │
└───────────┬───────────────────┬───────────────────┬───────────────────┬───────────┘
            │                   │                   │                   │
    ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
    │ ORCHESTRATOR  │   │  INVESTMENT   │   │     NEWS      │   │   KNOWLEDGE   │
    │    AGENT      │   │    AGENT      │   │    AGENT      │   │    AGENT      │
    │               │   │               │   │               │   │               │
    │ Intent Class. │   │ MSE Analysis  │   │ Finnhub API   │   │ RAG System    │
    │ User Profile  │   │ Personalized  │   │ Sentiment     │   │ Vector Search │
    │ Task Routing  │   │ Mongolian AI  │   │ Daily Digest  │   │ Embeddings    │
    └───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
            │
    ┌───────▼───────┐
    │   PYFLINK     │
    │   PLANNER     │
    │               │
    │ Complex Tasks │
    │ Multi-step    │
    │ Execution     │
    └───────────────┘
            │
    ┌───────▼─────────────────────────────────────────┐
    │              DATA LAYER                          │
    │   PostgreSQL 16 │ Redis 7 │ pgvector            │
    │   MSE Data │ Users │ Watchlists │ Cache          │
    └──────────────────────────────────────────────────┘
```

---

## AI Agents

### 1. Orchestrator Agent (Төлөвлөгч Агент)
- **Role**: Central coordinator using ReAct (Reasoning + Acting) pattern
- **Capabilities**: 
  - Intent classification (6 categories)
  - Complexity detection (simple vs multi-agent)
  - Dynamic task routing
  - User profile fetching for personalization
- **Technology**: Node.js, TypeScript, Gemini 2.0 Flash

### 2. Investment Agent (Хөрөнгө Оруулалтын Агент)
- **Role**: MSE stock analysis and personalized advice
- **Capabilities**:
  - Real-time MSE data analysis
  - Personalized recommendations based on user profile
  - Risk-adjusted investment advice
  - **Mongolian language responses**
- **Technology**: Node.js, TypeScript, Gemini AI, PostgreSQL

### 3. News Agent (Мэдээний Агент)
- **Role**: Financial news aggregation and sentiment analysis
- **Capabilities**:
  - Finnhub API integration for global news
  - AI-powered sentiment analysis (positive/negative/neutral)
  - Personalized daily news digest emails
  - Watchlist-based news filtering
- **Technology**: Node.js, TypeScript, Gemini AI, Resend Email

### 4. Knowledge Agent (Мэдлэгийн Агент)
- **Role**: RAG (Retrieval-Augmented Generation) system
- **Capabilities**:
  - Semantic vector search with pgvector
  - MSE company knowledge base
  - Context augmentation for other agents
- **Technology**: Node.js, TypeScript, Sentence-Transformers, PostgreSQL pgvector

### 5. PyFlink Planner (PyFlink Төлөвлөгч)
- **Role**: Complex multi-step task execution
- **Capabilities**:
  - Stateful stream processing
  - Multi-agent coordination
  - Execution plan generation
- **Technology**: Python 3.10, Apache Flink 1.18

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ and npm
- Python 3.10+ (for Flink jobs)
- Gemini API Key ([Get from Google AI Studio](https://aistudio.google.com/))

### 1. Clone and Setup

```bash
git clone <repository-url>
cd thesis-report

# Copy environment template
cp backend/env.example backend/.env

# Edit .env and add your keys:
# - GEMINI_API_KEY=your_key_here
# - FINNHUB_API_KEY=your_key_here (optional, for news)
# - RESEND_API_KEY=your_key_here (optional, for emails)
```

### 2. Start All Services

```bash
# Make script executable
chmod +x start-all-services.sh

# Start everything (Docker + Backend + Frontend)
./start-all-services.sh
```

This script will:
1. Start infrastructure (Kafka, PostgreSQL, Redis, Zookeeper)
2. Create Kafka topics
3. Start all 5 AI agents
4. Start API Gateway
5. Start Next.js frontend

### 3. Access the Application

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **API Gateway** | http://localhost:3001 |
| **Kafka UI** | http://localhost:8080 |
| **Health Check** | http://localhost:3001/health |

### 4. Stop All Services

```bash
./stop-all-services.sh
```

---

## 📁 Project Structure

```
thesis-report/
├── backend/
│   ├── api-gateway/          # Express.js API Gateway
│   │   ├── src/
│   │   │   ├── routes/       # API routes (users, watchlist, agent, mse)
│   │   │   ├── services/     # Kafka, Email services
│   │   │   └── utils/        # JWT, prompts, templates
│   │   └── package.json
│   │
│   ├── orchestrator-agent/   # Central coordinator agent
│   ├── investment-agent/     # MSE analysis agent
│   ├── news-agent/           # News & sentiment agent
│   ├── knowledge-agent/      # RAG system agent
│   ├── flink-planner/        # PyFlink multi-step planner
│   │
│   ├── database/
│   │   └── schema.sql        # PostgreSQL schema
│   ├── kafka/
│   │   └── topics.sh         # Kafka topic creation
│   │
│   └── docker-compose.yml    # Infrastructure services
│
├── frontend/
│   ├── app/                  # Next.js 15 App Router
│   │   ├── (root)/           # Authenticated pages
│   │   │   ├── page.tsx      # Home with MSE/Global/Watchlist tabs
│   │   │   ├── ai-agents/    # AI Chat interface
│   │   │   ├── stocks/[symbol]/ # Stock detail pages
│   │   │   └── watchlist/    # Watchlist management
│   │   └── (auth)/           # Login/Register pages
│   │
│   ├── components/
│   │   ├── stocks/           # MSEStockDetail, GlobalStockDetail
│   │   ├── mse/              # MSETopMovers, MSEHeatmap, MSEStocksTable
│   │   └── watchlist/        # WatchlistContent, WatchlistClientUI
│   │
│   └── lib/actions/          # Server actions (auth, mse, watchlist)
│
├── report/                   # LaTeX thesis report
│   ├── main.tex
│   └── figures/
│
├── start-all-services.sh     # Start all services
├── stop-all-services.sh      # Stop all services
└── README.md                 # This file
```

---

## 🔧 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15 | React framework with App Router |
| React | 19 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3.4 | Styling |
| Shadcn/ui | - | Component library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 | Runtime |
| Express.js | 4.18 | API Gateway |
| TypeScript | 5 | Type safety |
| Python | 3.10 | Flink Planner |
| Apache Flink | 1.18 | Stream processing |

### Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| Apache Kafka | 3.5 | Event streaming |
| Zookeeper | 3.8 | Kafka coordination |
| PostgreSQL | 16 | Database with pgvector |
| Redis | 7 | Caching & sessions |
| Docker | 24 | Containerization |

### AI & ML
| Technology | Purpose |
|------------|---------|
| Google Gemini 2.0 Flash | LLM for AI responses |
| Sentence-Transformers | Text embeddings (all-MiniLM-L6-v2) |
| pgvector | Vector similarity search |

### External APIs
| API | Purpose |
|-----|---------|
| Finnhub | Global stock news |
| Resend | Email delivery |

---

## 📊 Kafka Topics

```
user.requests       → User queries to orchestrator
user.events         → User registration, login events
agent.tasks         → Tasks routed to specific agents
agent.responses     → Responses from agents back
knowledge.queries   → RAG system queries
knowledge.results   → RAG system results
planning.tasks      → Complex tasks for Flink Planner
planning.results    → Flink planning results
monitoring.events   → System monitoring and metrics
```

---

## 🗄️ Database Schema

### Core Tables
- `users` - User accounts with investment profiles
- `watchlists` - Named watchlists per user
- `watchlist_items` - Stocks in each watchlist
- `agent_responses_cache` - Cached AI responses

### MSE Data Tables
- `mse_companies` - MSE company information
- `mse_trading_status` - Real-time trading data
- `mse_trading_history` - Historical price data

### Knowledge Base
- `knowledge_base` - RAG knowledge with vector embeddings

---

## 🧪 API Examples

### Register User
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "investmentGoal": "Growth",
    "riskTolerance": "Medium",
    "preferredIndustries": ["Technology", "Finance"]
  }'
```

### Query AI Agent
```bash
curl -X POST http://localhost:3001/api/agent/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "query": "KHAN хувьцааны талаар шинжилгээ хийнэ үү",
    "type": "portfolio",
    "context": { "symbols": ["KHAN-O-0000"] }
  }'
```

### Get MSE Trading Status
```bash
curl http://localhost:3001/api/mse/trading-status
```

---

## 📈 Performance Metrics

| Metric | Value |
|--------|-------|
| API Gateway Response | < 500ms |
| Kafka Message Delivery | 5-10ms |
| LLM Inference (Gemini) | 10-20s |
| Database Queries | 50-100ms |
| Total E2E with AI | ~17s |
| Idle Memory Usage | ~123MB total |

---

## 📝 Development

### View Logs
```bash
# All logs
tail -f logs/*.log

# Specific service
tail -f logs/investment-agent.log
tail -f logs/api-gateway.log
```

### Debug Kafka
```bash
# List topics
docker exec thesis-kafka kafka-topics --list --bootstrap-server localhost:9092

# Consume messages
docker exec thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic agent.responses \
  --from-beginning
```

### Database Access
```bash
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db

# Inside psql:
\dt                           # List tables
SELECT * FROM mse_companies;  # Query MSE data
```

---

## 📚 Thesis Documentation

The complete thesis report is available in the `report/` directory:
- **main.tex** - Main LaTeX document
- **Compile with**: `xelatex main.tex`

Key chapters:
1. AI Engineering and Agents
2. Microservices and EDA
3. Problem Definition and Solution
4. Implementation

---

## 🙏 Acknowledgments

- Supervisor: Associate Professor B.Suvdaa
- National University of Mongolia, MTES
- Google Gemini AI Team
- Apache Kafka & Flink Communities

---

## 📄 License

This project is part of a Bachelor's thesis and is provided for educational purposes.

---

**Built with ❤️ **

