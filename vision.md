# Vision & Architecture

**AI Agents for Microservices: Event-Driven Architecture**

---

## 🎯 Vision Statement

> **Build intelligent, scalable AI agent systems by combining the proven patterns of microservices architecture with the power of modern AI, using event-driven communication to achieve loose coupling and horizontal scalability.**

This project demonstrates that AI agents can be designed as **distributed microservices** rather than monolithic applications, enabling:

- **Independent scaling** of each agent based on demand
- **Fault isolation** where one agent's failure doesn't cascade
- **Technology diversity** where each agent can use optimal tools
- **Event replay** for debugging, auditing, and model retraining
- **Real-time streaming** for complex multi-step workflows

---

## 🏛️ Architectural Philosophy

### The Problem: N×M Coupling in Multi-Agent Systems

Traditional multi-agent architectures suffer from **tight coupling**:

```
           Agent A ←→ Agent B
              ↑↓  ╲  ↗  ↑↓
           Agent C ←→ Agent D
              ↑↓  ╱  ↖  ↑↓
           Agent E ←→ Agent F
```

**Issues:**
- Each new agent requires N new connections
- One agent failure cascades to all connected agents
- Synchronous calls create latency chains
- Difficult to scale individual agents
- Complex to debug and monitor

### The Solution: Event-Driven Architecture (EDA)

```
                        ┌───────────────────────┐
                        │    Event Bus (Kafka)  │
                        │   Decoupled, Logged   │
                        └───────────┬───────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │           │           │       │       │           │           │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│Agent A│ │Agent B│ │Agent C│ │Agent D│ │Agent E│ │Agent F│ │Agent G│
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘ └───────┘
    N + M connections instead of N × M
```

**Benefits:**
- Adding a new agent = 1 new connection
- Agents fail independently (fault isolation)
- Asynchronous processing (no latency chains)
- Scale any agent independently
- All events logged for debugging/replay

---

## 🧠 The ReAct Pattern: Reasoning + Acting

This architecture implements the **ReAct** (Reasoning and Acting) pattern for AI agents:

```
┌─────────────────────────────────────────────────────────────────┐
│                        ReAct Loop                               │
│                                                                 │
│   1. OBSERVE     →    2. THINK      →    3. ACT                │
│   (Get context)       (Reason)           (Execute tool)         │
│       ↑                                        │                │
│       └────────────────────────────────────────┘                │
│                    (Loop until done)                            │
└─────────────────────────────────────────────────────────────────┘
```

### How Our Orchestrator Implements ReAct

```typescript
// 1. OBSERVE: Receive user request and context
const { query, userId, context } = payload;
const userProfile = await getUserProfile(userId);

// 2. THINK: Classify intent and determine action
const intent = await intentClassifier.classify(query);
const complexity = await complexityDetector.detect(query);
const action = getAgentAction(intent, complexity);

// 3. ACT: Route to appropriate agent(s)
if (complexity.level === 'simple') {
  await routeToAgent(intent, query, userProfile);
} else {
  await routeToPlanner(intent, query, userProfile);  // Multi-step
}

// 4. LOOP: Wait for agent responses, aggregate if needed
```

---

## 🏗️ System Architecture Deep Dive

### Layer 1: Presentation (Frontend)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 15 Frontend                         │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Dashboard │ │AI Chat   │ │Watchlist │ │MSE Stocks│           │
│  │          │ │Interface │ │Manager   │ │Explorer  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│  Features:                                                      │
│  • Server-Side Rendering (SSR) for performance                  │
│  • Real-time updates via polling/SSE                            │
│  • Mongolian language UI                                        │
│  • Responsive design (mobile-first)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 2: API Gateway

```
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (Express.js)                    │
│                                                                 │
│  Authentication          Event Publishing        Aggregation    │
│  ┌──────────────┐        ┌──────────────┐       ┌───────────┐  │
│  │ JWT Tokens   │        │ Kafka        │       │ Response  │  │
│  │ User Context │   →    │ Producer     │   →   │ Collector │  │
│  │ Rate Limiting│        │              │       │ (Polling) │  │
│  └──────────────┘        └──────────────┘       └───────────┘  │
│                                                                 │
│  Endpoints:                                                     │
│  • /api/users/* - Authentication & profiles                     │
│  • /api/watchlist/* - Watchlist management                      │
│  • /api/agent/* - AI query interface                            │
│  • /api/mse/* - MSE data access                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 3: Event Bus (Kafka)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Apache Kafka Event Bus                       │
│                                                                 │
│  Topics:                                                        │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │ user.requests      │  │ agent.tasks        │                │
│  │ (User → Orch)      │  │ (Orch → Agents)    │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │ agent.responses    │  │ planning.tasks     │                │
│  │ (Agents → API)     │  │ (Complex → Flink)  │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                 │
│  Features:                                                      │
│  • Snappy compression for efficiency                            │
│  • 3 partitions per topic for parallelism                       │
│  • Consumer groups for load balancing                           │
│  • Event retention for replay                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 4: AI Agents

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Agent Layer                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ORCHESTRATOR AGENT (Central)               │   │
│  │                                                         │   │
│  │  • Intent Classification (6 categories)                 │   │
│  │  • Complexity Detection (simple/complex)                │   │
│  │  • User Profile Fetching                                │   │
│  │  • Dynamic Task Routing                                 │   │
│  └───────────────────────┬─────────────────────────────────┘   │
│                          │                                      │
│    ┌─────────────────────┼─────────────────────┐               │
│    │                     │                     │               │
│  ┌─▼───────────┐  ┌──────▼──────┐  ┌──────────▼─┐             │
│  │ INVESTMENT  │  │    NEWS     │  │  KNOWLEDGE │             │
│  │   AGENT     │  │   AGENT     │  │   AGENT    │             │
│  │             │  │             │  │            │             │
│  │ • MSE Data  │  │ • Finnhub   │  │ • RAG      │             │
│  │ • Gemini AI │  │ • Sentiment │  │ • Vectors  │             │
│  │ • Personal  │  │ • Email     │  │ • pgvector │             │
│  └─────────────┘  └─────────────┘  └────────────┘             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              PYFLINK PLANNER (Complex Tasks)            │   │
│  │                                                         │   │
│  │  • Multi-step execution plans                           │   │
│  │  • Agent coordination                                   │   │
│  │  • Stateful processing                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 5: Data Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                               │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │    PostgreSQL 16    │  │      Redis 7        │              │
│  │                     │  │                     │              │
│  │  • Users & Profiles │  │  • Session cache    │              │
│  │  • Watchlists       │  │  • Rate limiting    │              │
│  │  • MSE Companies    │  │  • Temp data        │              │
│  │  • Trading History  │  │                     │              │
│  │  • Response Cache   │  │                     │              │
│  │  • Knowledge Base   │  │                     │              │
│  │  • pgvector ext.    │  │                     │              │
│  └─────────────────────┘  └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Scenarios

### Scenario 1: Simple Query

```
User: "APU хувьцааны үнэ хэд вэ?"

1. Frontend → API Gateway
   POST /api/agent/query { query: "APU...", type: "portfolio" }

2. API Gateway → Kafka
   Topic: user.requests
   { requestId, userId, query, context }

3. Kafka → Orchestrator
   Classify intent: "market_analysis"
   Detect complexity: "simple"
   Fetch user profile

4. Orchestrator → Kafka
   Topic: agent.tasks
   Route to: investment-agent

5. Kafka → Investment Agent
   Fetch MSE data for APU
   Generate personalized response with Gemini

6. Investment Agent → Kafka
   Topic: agent.responses
   { requestId, response: "APU хувьцааны өнөөдрийн ханш..." }

7. API Gateway ← Kafka (poll)
   Cache response in database

8. Frontend ← API Gateway
   Display response to user
```

### Scenario 2: Complex Multi-Agent Query

```
User: "Миний watchlist-ийн хувьцаануудыг шинжилж, мэдээ олоод зөвлөгөө өг"

1. Frontend → API Gateway → Kafka → Orchestrator

2. Orchestrator analyzes:
   - Intent: portfolio_advice
   - Complexity: COMPLEX (needs multiple agents)

3. Orchestrator → PyFlink Planner
   Topic: planning.tasks
   { query, context, userId }

4. PyFlink Planner generates execution plan:
   {
     "steps": [
       { "agent": "knowledge", "action": "get_company_info" },
       { "agent": "news", "action": "fetch_news" },
       { "agent": "investment", "action": "analyze_portfolio" }
     ]
   }

5. Planner → agent.tasks (multiple)
   Sends parallel tasks to each agent

6. Agents execute in parallel:
   - Knowledge: Retrieves MSE company profiles
   - News: Fetches and analyzes news sentiment
   - Investment: Generates portfolio analysis

7. All agents → agent.responses
   Three responses collected

8. API Gateway aggregates responses
   Combines into unified response for user
```

---

## 🎨 Design Patterns Used

### 1. Event Sourcing
All state changes are stored as immutable events in Kafka, enabling:
- Complete audit trail
- Time-travel debugging
- Event replay for reprocessing

### 2. CQRS (Command Query Responsibility Segregation)
- **Commands**: Write to Kafka (user.requests, agent.tasks)
- **Queries**: Read from PostgreSQL cache (agent_responses_cache)

### 3. Saga Pattern
Complex workflows coordinated through events:
- Orchestrator initiates saga
- Each agent completes its step
- Compensation on failures (not fully implemented)

### 4. Consumer Groups
Multiple instances of same agent share workload:
```
investment-agent-group:
  - investment-agent-1 → partition-0
  - investment-agent-2 → partition-1
  - investment-agent-3 → partition-2
```

### 5. Backend for Frontend (BFF)
API Gateway tailored for frontend needs:
- Aggregates multiple service responses
- Handles authentication/authorization
- Transforms data for UI consumption

---

## 🌍 Localization Strategy

### Mongolian Language Support

1. **UI Elements**: All frontend text in Mongolian
2. **AI Responses**: Prompts instruct Gemini to respond in Mongolian
3. **Email Templates**: Welcome and daily digest in Mongolian
4. **Error Messages**: User-facing errors translated

### Prompt Engineering for Mongolian

```typescript
const prompt = `
Та Монголын Хөрөнгийн Биржийн мэргэжлийн шинжээч.
ЗААВАЛ Монгол хэлээр хариулна уу.
Товч, тодорхой (100-200 үг) байна.
Хэрэглэгчийн профайл: ${JSON.stringify(userProfile)}
МХБ өгөгдөл: ${JSON.stringify(mseData)}
Асуулт: ${query}
`;
```

---

## 🔮 Future Vision

### Phase 2: Real-time Enhancements
- WebSocket for live price updates
- Streaming AI responses (progressive display)
- Real-time collaborative watchlists

### Phase 3: Advanced AI
- Fine-tuned Mongolian financial model
- Automated trading signals
- Predictive analytics

### Phase 4: Production Scale
- Kubernetes deployment
- Multi-region support
- Enterprise authentication (SSO)

---

## 📚 References

1. **AI Engineering** - Chip Huyen (O'Reilly, 2024)
2. **ReAct: Reasoning and Acting** - IBM Think Topics
3. **Building Microservices** - Sam Newman (O'Reilly, 2015)
4. **Apache Kafka Documentation**
5. **Apache Flink Documentation**

---

## 🏆 Key Takeaways

1. **AI agents are microservices with brains** - They benefit from the same architectural patterns
2. **Event-driven beats request-response** for multi-agent coordination
3. **Loose coupling enables independent scaling** and fault isolation
4. **Kafka provides durability** - Events are never lost
5. **ReAct pattern** enables intelligent routing and planning
6. **Personalization requires context** - User profiles enhance AI responses
7. **Localization matters** - Mongolian language support for local market

---

*This architecture represents a modern approach to building AI systems that are scalable, maintainable, and production-ready.*

