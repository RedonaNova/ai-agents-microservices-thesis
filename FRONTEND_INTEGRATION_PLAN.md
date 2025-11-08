# Frontend Integration Plan

**Goal**: Replace Inngest-based functions with Kafka-powered backend agents while maintaining all existing features.

---

## 📋 Current Frontend Architecture

### Existing Features
1. **User Registration** → Welcome Email (Inngest + Gemini)
2. **Daily News** → Cron job (Inngest + Finnhub + Gemini)
3. **Authentication** → better-auth + MongoDB
4. **Watchlist** → MongoDB storage
5. **Stock Search** → Finnhub API

### Technology Stack
- **Frontend**: Next.js 14 (App Router)
- **Database**: MongoDB (Mongoose)
- **Auth**: better-auth
- **Background Jobs**: Inngest
- **Email**: Nodemailer
- **APIs**: Finnhub

---

## 🎯 Target Architecture

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/REST
         v
┌─────────────────────┐
│   API Gateway       │
│ (Express + Kafka)   │
└──────┬──────────────┘
       │ Kafka Events
       v
┌──────────────────────────────┐
│     Apache Kafka Cluster     │
│  (Event-Driven Messaging)    │
└──┬────┬────┬────┬────┬───────┘
   │    │    │    │    │
   v    v    v    v    v
 Agents (6 specialized AI agents)
```

---

## 🔧 Implementation Components

### 1. API Gateway Service ✅ IN PROGRESS

**Purpose**: Bridge frontend HTTP requests to Kafka backend

**Endpoints**:
```typescript
POST   /api/auth/register        // User registration
POST   /api/auth/login           // User login
GET    /api/user/profile         // Get user profile
POST   /api/user/watchlist       // Add to watchlist
DELETE /api/user/watchlist/:id   // Remove from watchlist

GET    /api/news                 // Get news (with watchlist)
POST   /api/portfolio/advice     // Get investment advice
POST   /api/market/analyze       // Market analysis
POST   /api/historical/analyze   // Technical analysis
POST   /api/risk/assess          // Risk assessment

GET    /api/agent/stream/:id     // SSE for real-time agent responses
```

**Features**:
- Express.js REST API
- Kafka producer (send requests)
- Kafka consumer (receive responses)
- Server-Sent Events (SSE)
- MongoDB integration
- CORS configuration
- Error handling

---

### 2. Welcome Email Agent ⏳ PENDING

**Purpose**: Replace Inngest welcome email function

**Flow**:
```
User Registration (Frontend)
  ↓
API Gateway: POST /api/auth/register
  ↓
Kafka: user-registration-events
  ↓
Welcome Email Agent (NEW)
  ↓
- Generate personalized intro (Gemini)
  - Send email (Nodemailer)
  - Store user metadata in MongoDB
```

**New Agent**: `/backend/welcome-email-agent`
- Consumes: `user-registration-events`
- Produces: `user-responses` (confirmation)
- Integrates: Gemini AI + Nodemailer + MongoDB

---

### 3. Daily News Integration ⏳ PENDING

**Purpose**: Use News Intelligence Agent instead of Inngest

**Current Flow**:
```
Inngest Cron (12:00 daily)
  ↓
Get all users → Get watchlists
  ↓
Fetch Finnhub news per user
  ↓
Summarize with Gemini
  ↓
Send emails
```

**New Flow**:
```
API Gateway Cron (or external scheduler)
  ↓
Kafka: news-intelligence-events (batch)
  ↓
News Intelligence Agent
  ↓
- Fetch news for watchlist symbols
  - Generate AI summary
  - Return structured data
  ↓
Email Service Agent (NEW)
  ↓
Send personalized news emails
```

**Enhancement**: Our News Intelligence Agent is already built! Just needs:
1. Batch processing support
2. Integration with email service
3. MongoDB user/watchlist queries

---

### 4. Frontend API Replacement 🔄

**Files to Modify**:

#### `/frontend/lib/actions/auth.actions.ts`
```typescript
// BEFORE (Inngest)
await inngest.send({ name: "app/user.created", data: {...} });

// AFTER (API Gateway)
await fetch('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ email, password, ...profile })
});
```

#### `/frontend/lib/actions/finnhub.actions.ts`
```typescript
// BEFORE (Direct Finnhub)
const news = await fetch(`${FINNHUB_BASE_URL}/news?...`);

// AFTER (News Intelligence Agent via API Gateway)
const news = await fetch('/api/news', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### `/frontend/app/api/inngest/route.ts`
```typescript
// DELETE THIS FILE - No longer needed
```

---

## 📊 Migration Steps

### Phase 1: API Gateway Setup (Current)
- [x] Create API Gateway directory structure
- [ ] Install dependencies
- [ ] Create Express server
- [ ] Setup Kafka producer/consumer
- [ ] Add MongoDB connection
- [ ] Implement SSE endpoint
- [ ] Add authentication middleware

### Phase 2: Welcome Email Migration
- [ ] Create Welcome Email Agent
- [ ] Setup Kafka topic: `user-registration-events`
- [ ] Migrate Gemini prompts
- [ ] Integrate Nodemailer
- [ ] Update frontend auth flow
- [ ] Test registration → email flow

### Phase 3: Daily News Migration
- [ ] Create Email Service Agent
- [ ] Modify News Intelligence Agent for batch processing
- [ ] Setup cron job in API Gateway
- [ ] Migrate news summarization logic
- [ ] Update email templates
- [ ] Test daily news delivery

### Phase 4: Frontend Updates
- [ ] Replace Inngest calls with API Gateway calls
- [ ] Update environment variables
- [ ] Add error handling
- [ ] Implement loading states
- [ ] Add SSE listeners for real-time updates

### Phase 5: Testing & Deployment
- [ ] Integration testing
- [ ] Load testing
- [ ] Monitor Kafka topics
- [ ] Performance optimization
- [ ] Documentation

---

## 🔑 Key Benefits

### Before (Inngest-based)
- ❌ Vendor lock-in (Inngest)
- ❌ Limited control over background jobs
- ❌ Single AI model per task
- ❌ No real-time streaming
- ❌ Monolithic approach

### After (Kafka-based)
- ✅ Open-source infrastructure
- ✅ Full control over event processing
- ✅ Multi-agent coordination
- ✅ Real-time SSE updates
- ✅ Microservice architecture
- ✅ Scalable & fault-tolerant
- ✅ Better for thesis demonstration

---

## 📝 Environment Variables

### API Gateway `.env`
```bash
PORT=3001
KAFKA_BROKER=localhost:9092
MONGODB_URI=mongodb://localhost:27017/thesis-db
GEMINI_API_KEY=your-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
JWT_SECRET=your-secret
CORS_ORIGIN=http://localhost:3000
```

### Frontend `.env.local` (Updated)
```bash
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3001
MONGODB_URI=mongodb://localhost:27017/thesis-db
BETTER_AUTH_SECRET=your-secret
# Remove INNGEST-related variables
```

---

## 🎓 Thesis Integration

### Demonstrates:
1. **Migration from Monolith to Microservices**
   - Before/After comparison
   - Performance metrics
   - Scalability improvements

2. **Event-Driven Architecture**
   - Kafka as message broker
   - Asynchronous processing
   - Fault tolerance

3. **AI Agent Orchestration**
   - Multi-agent coordination
   - Specialized intelligence
   - Context-aware responses

4. **Real-time Communication**
   - Server-Sent Events (SSE)
   - WebSocket alternative
   - Streaming responses

---

## 📈 Next Actions

### Immediate (This Session):
1. ✅ Create API Gateway structure
2. ⏳ Build core Express server
3. ⏳ Setup Kafka integration
4. ⏳ Implement user registration endpoint
5. ⏳ Create Welcome Email Agent

### Short-term (Next Session):
1. Migrate daily news functionality
2. Update frontend API calls
3. Test end-to-end flows
4. Add SSE for real-time updates

### Long-term:
1. Build remaining UI pages
2. Performance optimization
3. Load testing
4. Evaluation metrics
5. Thesis documentation

---

**Status**: 🟡 IN PROGRESS  
**Priority**: HIGH  
**Complexity**: MEDIUM  
**Estimated Time**: 3-4 hours for complete integration

