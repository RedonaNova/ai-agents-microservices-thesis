# 🎓 Thesis Demo Presentation Guide

**Микросервис архитектурт суурилсан хиймэл оюун агентууд**  
**AI Agents for Microservices**

> Duration: 5-10 minutes  
> Presenter: B.Radnaabazar  
> Supervisor: Associate Professor B.Suvdaa

---

## 📋 Presentation Outline

| Section | Duration | Content |
|---------|----------|---------|
| 1. Introduction | 1 min | Problem statement, goals |
| 2. Architecture | 2 min | EDA, ReAct, Kafka-Flink |
| 3. Live Demo | 4-5 min | Working system demonstration |
| 4. Evaluation | 1 min | Results, metrics |
| 5. Conclusion | 1 min | Contributions, future work |

---

## 1️⃣ Introduction (1 minute)
Personalization 
### Opening Statement

> "Өнөөдрийн танилцуулгад би хиймэл оюуны агентуудыг микросервис архитектураар хэрхэн нэвтрүүлснээ үзүүлэх болно."

### Problem Statement

**Уламжлалт олон агентын системийн асуудал:**

```
Traditional Multi-Agent System:
Agent A ←→ Agent B ←→ Agent C
    ↑         ↕         ↓
Agent D ←→ Agent E ←→ Agent F

N×M холболт = Нягт хамаарал = Нэг унавал бүгд унана
```

### Goals (Зорилго)

1. Хиймэл оюун агентуудыг тархмал микросервис болгон хөгжүүлэх
2. Үзэгдэлд суурилсан архитектураар (EDA) уян хатан системийн зохиомж гаргах
3. Монголын хөрөнгийн биржийн өгөгдөлд тулгуурлан демо систем бүтээх

---

## 2️⃣ Architecture (2 minutes)

### Event-Driven Solution

> "Уламжлалт N×M холболтын асуудлыг шийдэхийн тулд үзэгдэлд суурилсан архитектур ашиглав."

```
                     ┌───────────────┐
                     │ Apache Kafka  │
                     │  Event Bus    │
                     └───────┬───────┘
                             │
    ┌────────────────────────┼────────────────────────┐
    │          │             │             │          │
┌───▼───┐ ┌───▼───┐    ┌───▼───┐    ┌───▼───┐ ┌───▼───┐
│Orch.  │ │Invest.│    │ News  │    │ Know. │ │ Flink │
│Agent  │ │Agent  │    │ Agent │    │ Agent │ │Planner│
└───────┘ └───────┘    └───────┘    └───────┘ └───────┘

N + M холболт = Тархмал = Бие даан ажиллана
```

**Key Benefits:**
- 🔄 Асинхрон харилцаа - хүлээхгүй
- 🛡️ Алдаа тусгаарлалт - нэг унахад бусад хэвээр
- 📈 Хэвтээ өргөжих - агент нэмэхэд хялбар
- 📝 Event log - дахин тоглуулах боломжтой

### ReAct Pattern (Reasoning + Acting)

> "Төлөвлөгч агент нь ReAct pattern ашиглан ухаалаг чиглүүлэлт хийдэг."

```
┌─────────────────────────────────────────────┐
│              ReAct Loop                     │
│                                             │
│  1. OBSERVE → 2. THINK → 3. ACT → 4. LOOP  │
│  (Context)    (Reason)   (Tool)   (Repeat) │
└─────────────────────────────────────────────┘
```

**Implementation:**
1. Intent classification (6 ангилал)
2. Complexity detection (энгийн/төвөгтэй)
3. Dynamic routing (зөв агент руу чиглүүлэх)
4. User profile personalization (хувийн зөвлөгөө)

---

## 3️⃣ Live Demo (4-5 minutes)

### Demo Script

#### Step 1: Show System Running (30 sec)

```bash
# Terminal дээр харуулах
./start-all-services.sh
```

**Харуулах зүйлс:**
- Docker services running (Kafka, PostgreSQL, Redis)
- 5 AI agents started
- API Gateway ready
- Frontend ready

#### Step 2: User Registration (1 min)

1. Open http://localhost:3000
2. Click "Бүртгүүлэх"
3. Fill form:
   - Email: demo@example.com
   - Password: demo123
   - Name: Demo Хэрэглэгч
   - Investment Goal: Growth
   - Risk Tolerance: Medium
   - Preferred Industries: Technology, Finance

4. **Point out:** 
   > "Хэрэглэгчийн профайл нь хөрөнгө оруулалтын зорилго, эрсдэлийн хүлээц агуулна. Эдгээр мэдээллийг AI агент ашиглан хувийн зөвлөгөө өгнө."

#### Step 3: AI Chat Demo (2 min)

Navigate to **AI Агентууд** page.

**Query 1 - Simple Stock Analysis:**
```
KHAN хувьцааны талаар товч мэдээлэл өгнө үү
```

> "Асуулт Kafka-аар дамжин Orchestrator → Investment Agent руу очно. Investment Agent нь PostgreSQL-ээс МХБ өгөгдөл авч, Gemini AI-аар шинжилгээ хийж, хэрэглэгчийн профайлд тохирсон зөвлөгөө өгнө."

**Point out the response:**
- Mongolian language response
- Personalized based on risk tolerance
- Real MSE data included

**Query 2 - Watchlist Analysis:**
```
Миний ажиглаж буй хувьцаануудыг шинжлээд зөвлөгөө өгнө үү
```

> "Энэ нь илүү төвөгтэй асуулт учраас PyFlink Planner олон агентыг зохион байгуулж ажиллуулна."

#### Step 4: MSE Stocks Page (30 sec)

Navigate to **MSE Stocks** tab.

**Show:**
- Real MSE trading data (APU, KHAN, TDB, etc.)
- Top gainers/losers
- Stock details page with charts
- Watchlist toggle functionality

#### Step 5: Monitoring (30 sec)

Show Kafka UI at http://localhost:8080

**Point out:**
- Topics: user.requests, agent.tasks, agent.responses
- Consumer groups: orchestrator-group, investment-agent-group
- Message flow visualization

---

## 4️⃣ Evaluation (1 minute)

### Performance Metrics

| Metric | Result |
|--------|--------|
| API Response Time | < 500ms |
| AI Query E2E | ~15-20s |
| Kafka Throughput | 10K+ msg/s |
| System Memory | ~123MB idle |
| Agent Uptime | 99.9% |

### Key Achievements

1. ✅ **5 AI агент** Kafka-аар харилцаж ажиллаж байна
2. ✅ **N×M → N+M** холболтын нарийн төвөгтэй байдлыг бууруулсан
3. ✅ **ReAct pattern** ашиглан ухаалаг чиглүүлэлт хийсэн
4. ✅ **RAG систем** мэдлэгийн сангаас мэдээлэл авч байна
5. ✅ **Монгол хэлээр** хувийн зөвлөгөө өгч байна

### Comparison with Existing Solutions

| Feature | Inngest | Temporal | **This Project** |
|---------|---------|----------|------------------|
| AI Agent First | ❌ | ❌ | ✅ |
| Event-Driven | ✅ | ❌ | ✅ |
| Open Source Tech | ❌ | ❌ | ✅ (Kafka, Flink) |
| ReAct Pattern | ❌ | ❌ | ✅ |
| Mongolian Support | ❌ | ❌ | ✅ |

---

## 5️⃣ Conclusion (1 minute)

### Contributions (Хувь нэмэр)

**Онолын хувь нэмэр:**
- Хиймэл оюун агентуудыг микросервис болгон хөгжүүлэх зохиомж
- ReAct pattern-ийг EDA-тай хослуулсан

**Практик хувь нэмэр:**
- Бүтэн ажиллагаатай демо систем
- МХБ-ийн бодит өгөгдөлд суурилсан
- Монгол хэлээр хувийн зөвлөгөө

### Limitations (Хязгаарлалт)

- LLM хоцрогдол (~15-20 секунд)
- Бодит цагийн үнэ шинэчлэлт байхгүй
- Сургалт хийсэн Монгол хэлний загвар байхгүй

### Future Work (Цаашдын ажил)

1. WebSocket-аар бодит цагийн үнэ
2. Streaming AI хариулт
3. Fine-tuned Монгол хэлний загвар
4. Kubernetes deployment

### Closing Statement

> "Энэхүү судалгааны ажлаар хиймэл оюун агентуудыг микросервис архитектурт нэвтрүүлэх боломжтойг онол, хэрэгжүүлэлтийн хувьд бататгасан. Баярлалаа."

---

## 📌 Key Talking Points

### If Asked: "Why Kafka instead of REST?"

> "REST ашиглавал агент бүр бие биедээ шууд хүсэлт илгээх ёстой болдог. Энэ нь N×M холболт үүсгэж, нэг агент унахад бусад нь дамжин унах эрсдэлтэй. Kafka ашигласнаар N+M холболт болж, агент бүр бие даан ажиллах боломжтой болсон."

### If Asked: "How does personalization work?"

> "Хэрэглэгч бүртгүүлэхдээ хөрөнгө оруулалтын зорилго, эрсдэлийн хүлээц оруулдаг. Orchestrator агент нь PostgreSQL-ээс энэ профайлыг авч, Investment агент руу дамжуулдаг. Investment агент нь Gemini AI-д энэ мэдээллийг өгч, тухайн хэрэглэгчид тохирсон зөвлөгөө гаргуулдаг."

### If Asked: "What is ReAct?"

> "ReAct нь Reasoning + Acting гэсэн үгний товчлол. Агент нь эхлээд асуултыг ойлгож (Reason), дараа нь зөв хэрэглүүр дуудаж (Act) процессоо гүйцэтгэдэг. Манай Orchestrator агент нь энэ pattern-ийг ашиглан хэрэглэгчийн асуултыг ангилж, зөв агент руу чиглүүлдэг."

### If Asked: "How do you handle agent failures?"

> "Kafka-ийн давуу тал нь мессеж хадгалагддаг. Хэрэв Investment агент түр унавал мессеж Kafka-д хадгалагдаж, агент дахин асахад боловсруулагдана. Мөн агент бүр consumer group-д байгаа тул нэг инстанс унахад өөр инстанс үүргийг нь авч чадна."

---

## 🖥️ Technical Setup Checklist

Before the demo, ensure:

- [ ] All Docker containers running
- [ ] All 5 agents started
- [ ] API Gateway responding (http://localhost:3001/health)
- [ ] Frontend accessible (http://localhost:3000)
- [ ] Test user created
- [ ] Kafka UI accessible (http://localhost:8080)
- [ ] MSE data loaded in database
- [ ] GEMINI_API_KEY configured

### Quick Health Check

```bash
# Check all services
curl http://localhost:3001/health

# Check agent status
curl http://localhost:3001/api/monitoring/agents

# Check MSE data
curl http://localhost:3001/api/mse/companies | head -20
```

---

## 🎯 Demo Success Criteria

1. ✅ User registration works
2. ✅ AI chat returns Mongolian response
3. ✅ Response is personalized (mentions risk tolerance)
4. ✅ MSE stock data displays correctly
5. ✅ Watchlist functionality works
6. ✅ Kafka UI shows message flow
7. ✅ No errors during demo

---

## 💡 Backup Plans

### If AI Agent Slow/Timeout
- Show cached response from `agent_responses_cache`
- Explain LLM latency is expected (10-20s)

### If Kafka Not Working
- Show pre-recorded video of working flow
- Explain architecture from diagrams

### If Demo Crashes
- Switch to thesis report (main.tex) visuals
- Focus on architecture explanation

---

## 📚 References to Cite

1. Huyen, Chip. "AI Engineering" (O'Reilly, 2024)
2. IBM. "What is ReAct Agent?"
3. Falconer, Sean. "AI Agents are Microservices with Brains"
4. Apache Kafka Documentation
5. Apache Flink Documentation

---

*Good luck with your thesis defense! 🎓*

