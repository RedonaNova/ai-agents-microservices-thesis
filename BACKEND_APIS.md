# 🚀 Backend API Documentation

**API Gateway**: `http://localhost:3001`  
**Status**: ✅ Fully Operational  
**Last Updated**: November 11, 2025

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Watchlist Management](#watchlist-management)
4. [Daily News Email](#daily-news-email)
5. [AI Agents](#ai-agents)
6. [News](#news)
7. [Monitoring](#monitoring)

---

## 🔐 Authentication

### Register New User

**Endpoint**: `POST /api/users/register`

**Features**:
- ✅ Creates user account in PostgreSQL
- ✅ Sends personalized welcome email with Gemini AI
- ✅ Publishes `user.registered` event to Kafka
- ✅ Returns JWT token for immediate login

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "investmentGoal": "Long-term growth",
  "riskTolerance": "moderate",
  "preferredIndustries": ["Technology", "Healthcare"]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "investmentGoal": "Long-term growth",
    "riskTolerance": "moderate",
    "preferredIndustries": ["Technology", "Healthcare"]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**What Happens**:
1. User registered in PostgreSQL
2. Password hashed with bcrypt
3. Gemini AI generates personalized welcome message
4. Welcome email sent asynchronously
5. Kafka event published to `user.events` topic
6. JWT token generated (7-day expiry)

---

### Login

**Endpoint**: `POST /api/users/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "investmentGoal": "Long-term growth",
    "riskTolerance": "moderate",
    "preferredIndustries": ["Technology", "Healthcare"]
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**What Happens**:
1. Verifies email and password
2. Updates `last_login` timestamp
3. Publishes `user.login` event to Kafka
4. Returns JWT token

---

## 👤 User Management

### Get User Profile

**Endpoint**: `GET /api/users/profile`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "investmentGoal": "Long-term growth",
    "riskTolerance": "moderate",
    "preferredIndustries": ["Technology", "Healthcare"],
    "createdAt": "2025-11-10T12:00:00.000Z",
    "lastLogin": "2025-11-10T17:25:00.000Z"
  }
}
```

---

### Update User Profile

**Endpoint**: `PUT /api/users/profile`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "name": "John Updated",
  "investmentGoal": "Aggressive growth",
  "riskTolerance": "high",
  "preferredIndustries": ["Technology", "Energy", "Finance"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Updated",
    "investmentGoal": "Aggressive growth",
    "riskTolerance": "high",
    "preferredIndustries": ["Technology", "Energy", "Finance"]
  }
}
```

**What Happens**:
1. Updates user profile in PostgreSQL
2. Publishes `user.profile.updated` event to Kafka

---

## 📊 Watchlist Management

### Get All Watchlists

**Endpoint**: `GET /api/watchlist`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "watchlists": [
    {
      "id": "uuid-1",
      "name": "Tech Stocks",
      "created_at": "2025-11-10T10:00:00.000Z",
      "updated_at": "2025-11-10T15:30:00.000Z",
      "item_count": 5
    },
    {
      "id": "uuid-2",
      "name": "MSE Mining",
      "created_at": "2025-11-10T11:00:00.000Z",
      "updated_at": "2025-11-10T16:00:00.000Z",
      "item_count": 3
    }
  ]
}
```

---

### Create New Watchlist

**Endpoint**: `POST /api/watchlist`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "name": "My Tech Portfolio"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "watchlist": {
    "id": "uuid-3",
    "name": "My Tech Portfolio",
    "created_at": "2025-11-10T17:30:00.000Z",
    "updated_at": "2025-11-10T17:30:00.000Z"
  }
}
```

**What Happens**:
1. Creates watchlist in PostgreSQL
2. Publishes `watchlist.created` event to Kafka

---

### Get Watchlist Items

**Endpoint**: `GET /api/watchlist/:id/items`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid-item-1",
      "symbol": "AAPL",
      "is_mse": false,
      "added_at": "2025-11-10T10:30:00.000Z"
    },
    {
      "id": "uuid-item-2",
      "symbol": "ERDENET",
      "is_mse": true,
      "added_at": "2025-11-10T11:00:00.000Z"
    }
  ]
}
```

---

### Add Item to Watchlist

**Endpoint**: `POST /api/watchlist/:id/items`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Request Body**:
```json
{
  "symbol": "MSFT",
  "isMse": false
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "item": {
    "id": "uuid-item-3",
    "symbol": "MSFT",
    "is_mse": false,
    "added_at": "2025-11-10T17:35:00.000Z"
  }
}
```

**What Happens**:
1. Adds symbol to watchlist
2. Updates watchlist timestamp
3. Publishes `watchlist.item.added` event to Kafka

---

### Remove Item from Watchlist

**Endpoint**: `DELETE /api/watchlist/:id/items/:symbol`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Item removed from watchlist"
}
```

**What Happens**:
1. Removes symbol from watchlist
2. Updates watchlist timestamp
3. Publishes `watchlist.item.removed` event to Kafka

---

### Delete Watchlist

**Endpoint**: `DELETE /api/watchlist/:id`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Watchlist deleted"
}
```

**What Happens**:
1. Deletes watchlist and all items (CASCADE)
2. Publishes `watchlist.deleted` event to Kafka

---

### Get All Watchlist Symbols

**Endpoint**: `GET /api/watchlist/all/symbols`

**Headers**:
```
Authorization: Bearer <jwt_token>
```

**Purpose**: Used by daily news email to fetch news for user's watchlisted stocks

**Response** (200 OK):
```json
{
  "success": true,
  "symbols": ["AAPL", "MSFT", "ERDENET", "TAVT"],
  "symbolsWithType": [
    { "symbol": "AAPL", "is_mse": false },
    { "symbol": "MSFT", "is_mse": false },
    { "symbol": "ERDENET", "is_mse": true },
    { "symbol": "TAVT", "is_mse": true }
  ]
}
```

---

## 📰 Daily News Email

### Send Daily News to All Users

**Endpoint**: `POST /api/daily-news/send`

**Purpose**: Trigger daily news email job (can be called via cron or manually)

**How It Works**:
1. ✅ Fetches all users from database
2. ✅ For each user, gets their watchlist symbols
3. ✅ Fetches personalized news from Finnhub API
4. ✅ Uses Gemini AI to generate clean HTML summary
5. ✅ Sends beautifully formatted email

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Daily news emails sent to 15/20 users",
  "sent": 15,
  "total": 20,
  "results": [
    {
      "email": "user1@example.com",
      "success": true,
      "articleCount": 6
    },
    {
      "email": "user2@example.com",
      "success": true,
      "articleCount": 4
    }
  ]
}
```

**Cron Schedule Example**:
```bash
# Send daily at 12:00 PM
0 12 * * * curl -X POST http://localhost:3001/api/daily-news/send
```

---

### Test News Email (Single User)

**Endpoint**: `POST /api/daily-news/test`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "articleCount": 6,
  "watchlistSymbols": ["AAPL", "MSFT", "ERDENET"]
}
```

---

## 🤖 AI Agents

### Send Query to AI Agents

**Endpoint**: `POST /api/agent/query`

**Request Body**:
```json
{
  "query": "I want to invest 10M MNT in Mongolian mining stocks",
  "type": "investment"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "requestId": "uuid-request-1",
  "message": "Query submitted successfully"
}
```

**What Happens**:
1. Publishes query to `user.requests` Kafka topic
2. Orchestrator Agent consumes and classifies intent
3. Routes to appropriate agent (Investment, News, or Knowledge)
4. Agent processes and generates AI response
5. Response published to `agent.responses` topic

**Event Flow**:
```
User → API Gateway → user.requests → Orchestrator → agent.tasks → Investment Agent → agent.responses
```

---

## 📡 Monitoring

### Get Agent Status

**Endpoint**: `GET /api/monitoring/agents`

**Response** (200 OK):
```json
{
  "success": true,
  "agents": [
    {
      "name": "orchestrator-agent",
      "status": "healthy",
      "uptime": "2 hours",
      "lastSeen": "2025-11-10T17:35:00.000Z"
    },
    {
      "name": "investment-agent",
      "status": "healthy",
      "uptime": "2 hours",
      "lastSeen": "2025-11-10T17:35:00.000Z"
    }
  ]
}
```

---

### Get System Metrics

**Endpoint**: `GET /api/monitoring/metrics`

**Response** (200 OK):
```json
{
  "success": true,
  "metrics": {
    "totalRequests": 1234,
    "avgLatency": "120ms",
    "errorRate": "0.5%"
  }
}
```

---

## 🎯 Email Features

### Personalized Welcome Email

**Trigger**: Automatically sent on user registration

**Features**:
- ✅ AI-generated personalized intro based on user profile
- ✅ Uses Gemini AI to reference user's investment goals, risk tolerance, and preferences
- ✅ Beautiful dark-themed HTML email
- ✅ Mobile-responsive design
- ✅ Call-to-action button to get started

**Example Personalized Intro**:
```html
<p>Thanks for joining Redona! As someone focused on <strong>technology growth stocks</strong> 
with <strong>moderate risk tolerance</strong>, you'll love our real-time alerts. We'll help 
you spot opportunities before they become mainstream news.</p>
```

---

### Daily News Summary Email

**Trigger**: Manual (`POST /api/daily-news/send`) or Cron Job

**Features**:
- ✅ Personalized news based on user's watchlist
- ✅ Gemini AI-powered news summarization
- ✅ Clean HTML formatting with sections (📊 Market Overview, 📈 Top Gainers, etc.)
- ✅ Bullet-point key takeaways in plain English
- ✅ "Bottom Line" explanations for everyday investors
- ✅ "Read Full Story" links to original articles
- ✅ Mobile-responsive dark theme

**Example News Section**:
```html
<h3>📈 Top Gainers</h3>
<div style="background-color: #212328; padding: 24px; border-radius: 8px;">
  <h4>Apple Stock Jumped After Great Earnings Report</h4>
  <ul>
    <li>• Apple stock jumped 5.2% after beating earnings expectations.</li>
    <li>• iPhone sales expected to grow 8% next quarter.</li>
    <li>• App store revenue hit $22.3 billion (up 14%).</li>
  </ul>
  <div style="background-color: #141414; padding: 15px;">
    <p>💡 <strong>Bottom Line:</strong> Apple is making money in different ways, 
    so it's a pretty safe stock even when the economy gets shaky.</p>
  </div>
  <a href="https://...">Read Full Story →</a>
</div>
```

---

## 🔄 Event-Driven Architecture

All critical operations publish events to Kafka:

| Event Type | Topic | Trigger |
|------------|-------|---------|
| `user.registered` | `user.events` | User registration |
| `user.login` | `user.events` | User login |
| `user.profile.updated` | `user.events` | Profile update |
| `watchlist.created` | `user.events` | New watchlist |
| `watchlist.item.added` | `user.events` | Add stock to watchlist |
| `watchlist.item.removed` | `user.events` | Remove stock from watchlist |
| `watchlist.deleted` | `user.events` | Delete watchlist |

---

## 🧪 Testing

### Test User Registration + Welcome Email
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "name": "Test User",
    "investmentGoal": "Long-term wealth building",
    "riskTolerance": "moderate",
    "preferredIndustries": ["Technology", "Healthcare"]
  }'
```

### Test Daily News Email
```bash
curl -X POST http://localhost:3001/api/daily-news/test \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Test Watchlist Creation
```bash
# First, get the token from registration/login response
TOKEN="your_jwt_token_here"

# Create watchlist
curl -X POST http://localhost:3001/api/watchlist \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Tech Stocks"}'

# Add items to watchlist (replace WATCHLIST_ID with the ID from previous response)
curl -X POST http://localhost:3001/api/watchlist/WATCHLIST_ID/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL", "isMse": false}'
```

---

## 🎉 What's Implemented

✅ **User Registration** - with personalized AI-generated welcome email  
✅ **User Login** - JWT-based authentication  
✅ **User Profile Management** - get/update profile  
✅ **Watchlist CRUD** - create, read, update, delete watchlists and items  
✅ **Daily News Email** - personalized news based on watchlist with AI summarization  
✅ **AI Agent Integration** - query endpoint with event-driven routing  
✅ **Email Service** - Gemini AI-powered email generation  
✅ **Finnhub Integration** - fetch real market news  
✅ **Event Publishing** - Kafka events for all critical operations  
✅ **PostgreSQL Storage** - single source of truth  
✅ **Beautiful Email Templates** - dark-themed, mobile-responsive  

---

## 📊 Architecture Diagram

```
┌─────────────┐
│  Frontend   │
│ (Next.js)   │
└──────┬──────┘
       │ HTTP/REST
       ↓
┌─────────────────┐
│  API Gateway    │ ← You Are Here!
│  (Port 3001)    │
└────┬─────┬──────┘
     │     │
     │     └─────→ PostgreSQL (users, watchlists, profiles)
     │
     ↓
╔════════════════╗
║  Apache Kafka  ║
║  Topics:       ║
║  - user.events ║
║  - user.requests
║  - agent.tasks ║
║  - agent.responses
╚═══┬═══════════╝
    │
    ├─→ Orchestrator Agent (intent classification)
    ├─→ Investment Agent (portfolio advice)
    ├─→ News Agent (market news)
    └─→ Knowledge Agent (RAG with Mongolian support)
```

---

## 🎯 Next Steps for Frontend

1. **User Registration Form** → Call `POST /api/users/register`
2. **Login Form** → Call `POST /api/users/login`
3. **Watchlist UI** → Use watchlist CRUD endpoints
4. **Daily News Toggle** → Users can opt-in/out (stored in user preferences)
5. **AI Chat Interface** → Use `POST /api/agent/query`

---

**🎊 All Backend APIs are fully operational and ready for frontend integration!**

**Last Updated**: November 11, 2025 01:30  
**API Gateway**: http://localhost:3001  
**Status**: ✅ **READY FOR PRODUCTION**

