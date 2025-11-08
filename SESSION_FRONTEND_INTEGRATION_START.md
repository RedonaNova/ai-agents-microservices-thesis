# Frontend Integration Session - November 8, 2025

## 🎯 Session Goal
Integrate Next.js frontend with Kafka-powered backend agents, replacing Inngest-based functions.

---

## ✅ Analysis Complete

### Current Frontend Architecture Analyzed:
1. **User Registration Flow**:
   - `auth.actions.ts` → Creates user with better-auth
   - Sends `app/user.created` event to Inngest
   - Inngest function generates personalized welcome email with Gemini
   - Sends email via Nodemailer

2. **Daily News Flow**:
   - Cron job (12:00 daily) in Inngest
   - Fetches all users from MongoDB
   - Gets watchlist symbols per user
   - Fetches news from Finnhub API
   - Summarizes with Gemini
   - Sends personalized emails

3. **Database**:
   - MongoDB with Mongoose
   - Collections: `user` (better-auth), `watchlist`
   - Stores: email, name, country, investment goals, risk tolerance

4. **Current APIs**:
   - Finnhub: Stock search & news
   - Better-auth: Authentication
   - Inngest: Background jobs

---

## 📋 Integration Plan Created

### Phase 1: API Gateway ✅ STARTED
**Purpose**: HTTP → Kafka bridge

**Structure Created**:
```
/backend/api-gateway/
  ├── package.json          ✅ Created
  ├── tsconfig.json        ✅ Created
  └── src/
      ├── routes/          ✅ Directory ready
      ├── middleware/      ✅ Directory ready
      └── services/        ✅ Directory ready
```

**Planned Endpoints**:
- `POST /api/auth/register` - User registration → Kafka
- `GET /api/news` - News for user's watchlist
- `POST /api/portfolio/advice` - Investment advice
- `POST /api/market/analyze` - Market analysis
- `GET /api/agent/stream/:id` - SSE for real-time responses

---

### Phase 2: Welcome Email Agent ⏳ PENDING
**Purpose**: Replace Inngest welcome function

**New Kafka Flow**:
```
Frontend Registration
  ↓
API Gateway
  ↓
Kafka: user-registration-events
  ↓
Welcome Email Agent (NEW)
  ↓
- Generate personalized intro (Gemini)
- Send email (Nodemailer)
- Confirm via user-responses topic
```

**Files to Create**:
- `/backend/welcome-email-agent/`
- Kafka consumer for `user-registration-events`
- Gemini integration (reuse prompts from frontend)
- Nodemailer integration
- MongoDB connection for user metadata

---

### Phase 3: Daily News Integration ⏳ PENDING
**Purpose**: Use News Intelligence Agent

**Current**: Inngest + Finnhub → Gemini → Email  
**Target**: Kafka → News Intelligence Agent → Email Service Agent

**Architecture**:
1. **Scheduler** (in API Gateway or separate cron)
   - Triggers daily at 12:00
   - Fetches users + watchlists from MongoDB
   - Sends batch event to Kafka

2. **News Intelligence Agent** (ALREADY BUILT!)
   - Already generates news with sentiment
   - Just needs to accept watchlist symbols
   - Returns structured news data

3. **Email Service Agent** (NEW)
   - Consumes news agent responses
   - Formats email HTML
   - Sends via Nodemailer
   - Tracks delivery

---

### Phase 4: Frontend Updates ⏳ PENDING
**Files to Modify**:

1. **`/frontend/lib/actions/auth.actions.ts`**:
```typescript
// Replace Inngest event
export const signUpWithEmail = async (data: SignUpFormData) => {
  // Keep better-auth signup
  const response = await auth.api.signUpEmail({...});
  
  // REPLACE Inngest with API Gateway
  // OLD: await inngest.send({ name: "app/user.created", data })
  // NEW: await fetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data) })
  
  await fetch(`${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, name, country, investmentGoals, riskTolerance, preferredIndustry
    })
  });
};
```

2. **`/frontend/lib/actions/finnhub.actions.ts`**:
```typescript
// Add new function to use News Intelligence Agent
export async function getNewsFromAgent(userId: string): Promise<MarketNewsArticle[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/api/news`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-User-ID': userId
    }
  });
  const data = await response.json();
  return data.articles; // From News Intelligence Agent
}
```

3. **Delete**: `/frontend/app/api/inngest/route.ts`

---

## 🏗️ Implementation Roadmap

### Immediate Next Steps:
1. **Complete API Gateway Core** (1 hour)
   - Express server setup
   - Kafka producer/consumer
   - MongoDB connection
   - Basic routes

2. **Build Welcome Email Agent** (45 min)
   - Copy agent structure from existing agents
   - Integrate Gemini (reuse prompts)
   - Setup Nodemailer
   - Test registration flow

3. **Modify News Intelligence Agent** (30 min)
   - Add batch processing support
   - Accept user watchlist data
   - Return structured responses

4. **Create Email Service Agent** (45 min)
   - Consume news responses
   - Format emails (reuse templates)
   - Send via Nodemailer

5. **Update Frontend** (45 min)
   - Replace Inngest calls
   - Add API Gateway endpoints
   - Test end-to-end flows

**Total Estimated Time**: 3-4 hours

---

## 🔑 Key Files Reference

### Frontend Files Analyzed:
- ✅ `/frontend/lib/actions/auth.actions.ts` - Registration & login
- ✅ `/frontend/lib/actions/finnhub.actions.ts` - Stock search & news
- ✅ `/frontend/lib/actions/user.actions.ts` - User queries
- ✅ `/frontend/lib/actions/watchlist.actions.ts` - Watchlist operations
- ✅ `/frontend/lib/inngest/functions.ts` - Inngest functions to replace
- ✅ `/frontend/lib/inngest/prompts.ts` - Gemini prompts to reuse
- ✅ `/frontend/database/mongoose.ts` - MongoDB connection

### Existing Backend Agents:
- ✅ Orchestrator Agent - Intent classification
- ✅ Portfolio Advisor Agent - Investment recommendations
- ✅ Market Analysis Agent - Market trends
- ✅ **News Intelligence Agent** - NEWS GENERATION (use this!)
- ✅ Historical Analysis Agent - Technical indicators
- ✅ Risk Assessment Agent - VaR & Monte Carlo

### To Create:
- ⏳ API Gateway Service
- ⏳ Welcome Email Agent
- ⏳ Email Service Agent (for daily news)

---

## 📊 Current System Status

### Backend: 🟢 ALL 6 AGENTS OPERATIONAL
- Orchestrator ✅
- Portfolio Advisor ✅
- Market Analysis ✅
- News Intelligence ✅
- Historical Analysis ✅
- Risk Assessment ✅

### Infrastructure: 🟢 RUNNING
- Kafka ✅
- PostgreSQL ✅ (MSE data)
- MongoDB ⚠️ (needs connection from backend)
- Qdrant ✅
- Redis ✅

### Frontend Integration: 🟡 IN PROGRESS
- Analysis ✅
- Plan ✅
- API Gateway Structure ✅
- Implementation ⏳

---

## 💡 Design Decisions

### Why API Gateway?
- ✅ Single entry point for frontend
- ✅ Shields Kafka complexity from frontend
- ✅ Enables SSE for real-time updates
- ✅ Centralized authentication
- ✅ Rate limiting & monitoring

### Why Keep MongoDB?
- ✅ better-auth requires MongoDB
- ✅ Already has user data
- ✅ Fast user/watchlist queries
- ✅ No need to migrate

### PostgreSQL vs MongoDB?
- **PostgreSQL**: MSE trading data (structured, historical)
- **MongoDB**: User data, profiles, watchlists (flexible, auth)
- **Both**: Optimal for different data types

### Why Not Replace Nodemailer?
- ✅ Works well
- ✅ No need to change
- ✅ Just move to backend agent

---

## 🎓 Thesis Value

### Before (Inngest Monolith):
```
Frontend → Inngest → Gemini → Email
```
- Single vendor dependency
- Limited scalability
- No real-time capabilities
- Hard to monitor

### After (Microservices):
```
Frontend → API Gateway → Kafka → Specialized Agents
```
- Open-source stack
- Independently scalable
- Real-time SSE
- Easy monitoring
- Multi-agent coordination

### Demonstrates:
1. **Migration Strategy** - Monolith → Microservices
2. **Event-Driven Architecture** - Kafka messaging
3. **AI Agent Orchestration** - Multi-agent system
4. **API Gateway Pattern** - BFF (Backend for Frontend)
5. **Real-time Communication** - Server-Sent Events

---

## 📈 Success Metrics

### Functional Requirements:
- ✅ User registration triggers welcome email
- ✅ Daily news delivered at 12:00
- ✅ News based on user's watchlist
- ✅ Personalized content (Gemini AI)
- ✅ All existing features maintained

### Performance Improvements:
- 🎯 Faster response times (parallel processing)
- 🎯 Better scalability (independent agents)
- 🎯 Real-time updates (SSE)
- 🎯 Fault tolerance (Kafka retries)

### Thesis Metrics:
- 🎯 Response time: Inngest vs Kafka
- 🎯 Scalability: 100+ concurrent users
- 🎯 Reliability: Message delivery rate
- 🎯 Cost: Infrastructure comparison

---

## 🚀 Next Session Plan

### Option 1: Complete Integration (Recommended)
**Time**: 3-4 hours  
**Tasks**:
1. Build API Gateway
2. Create Welcome Email Agent
3. Modify News Intelligence Agent
4. Create Email Service Agent
5. Update frontend code
6. End-to-end testing

### Option 2: Incremental Approach
**Session 1** (1.5 hours): API Gateway + Welcome Email
**Session 2** (1.5 hours): News Integration + Testing
**Session 3** (1 hour): Frontend Updates + Polish

---

## 📝 Quick Commands

### Start API Gateway (when ready):
```bash
cd /home/it/apps/thesis-report/backend/api-gateway
npm install
npm run dev
```

### Test Registration Flow:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","country":"Mongolia"}'
```

### Monitor Kafka Topics:
```bash
# Watch user registration events
docker exec thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-registration-events \
  --from-beginning

# Watch user responses
docker exec thesis-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-responses \
  --from-beginning
```

---

## ✅ Summary

### Accomplished:
- ✅ Analyzed current frontend architecture
- ✅ Identified all Inngest functions to replace
- ✅ Created comprehensive integration plan
- ✅ Started API Gateway structure
- ✅ Documented migration strategy

### Ready to Build:
- ⏳ API Gateway implementation
- ⏳ Welcome Email Agent
- ⏳ Email Service Agent
- ⏳ Frontend code updates

### Benefits:
- 🎯 Removes vendor lock-in (Inngest)
- 🎯 Enables real-time features
- 🎯 Better thesis demonstration
- 🎯 Production-ready architecture
- 🎯 Scalable & maintainable

---

**Status**: 🟡 **Integration Started - Ready for Implementation**  
**Next Step**: Complete API Gateway or Welcome Email Agent  
**Estimated Completion**: 3-4 hours of focused work

Would you like to:
1. **Continue with API Gateway implementation now**
2. **Build Welcome Email Agent first (simpler)**
3. **Review the plan and start fresh next session**

