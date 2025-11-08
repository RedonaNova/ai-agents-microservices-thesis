# Market Data Architecture

## 🎯 Problem: Multiple Data Sources

Your application uses different data sources:
1. **MSE Data** (Mongolian Stock Exchange) - Your local historical + current data
2. **Finnhub API** - US stocks real-time data (from frontend)
3. **TradingView Widget** - Client-side charts

## ✅ Recommended Architecture: Separate Market Data Service

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ TradingView  │  │   Charts     │  │   Portfolio  │     │
│  │   Widget     │  │  (client)    │  │   Dashboard  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    ▼                    │
         │          ┌──────────────────┐          │
         │          │   API Gateway    │          │
         │          │  (Express/Next)  │          │
         │          └──────────────────┘          │
         │                    │                    │
         ▼                    ▼                    ▼
┌────────────────────────────────────────────────────────────┐
│                      Kafka Event Bus                       │
│  Topics: us-stock-updates, mse-stock-updates, news-events │
└────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  US Market   │    │  MSE Market  │    │    Redis     │
│ Data Service │    │ Data Service │    │   (Cache)    │
│  (Node.js)   │    │  (Node.js)   │    │              │
│              │    │              │    │  5min TTL    │
│ - Finnhub   │    │ - Local DB   │    │              │
│ - Alpha V.  │    │ - CSV/JSON   │    │              │
│ - Yahoo Fin.│    │ - API calls  │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
         │                    │
         ▼                    ▼
┌──────────────────────────────────────┐
│          PostgreSQL                   │
│  - us_stocks (cache)                 │
│  - mse_trading_history ✅ (52K rows) │
│  - mse_companies ✅                  │
└──────────────────────────────────────┘
```

## 📊 Service Breakdown

### 1. MSE Market Data Service ✅ (Already Built!)

**Status**: ✅ **Completed**

**Location**: `/backend/mse-ingestion-service/`

**What it does**:
- Loads your local MSE data (TradingHistory.json, TradingStatus.json)
- Publishes to `mse-stock-updates` Kafka topic
- Stores in PostgreSQL
- 52,187 records from 2018-2025

**Kafka Topics**:
- Produces: `mse-stock-updates`, `mse-company-updates`

**API Endpoints** (to add):
```typescript
GET  /api/mse/stocks/:symbol          // Get stock info
GET  /api/mse/stocks/:symbol/history  // Historical data
GET  /api/mse/companies                // List all MSE companies
POST /api/mse/sync                     // Trigger data sync
```

---

### 2. US Market Data Service (To Build)

**Status**: ⏳ **Recommended Next**

**Location**: `/backend/us-market-data-service/` (new)

**What it does**:
- Fetches US stock data from Finnhub API
- Caches in Redis (5-minute TTL to save API costs)
- Publishes to `us-stock-updates` Kafka topic
- Stores in PostgreSQL for historical analysis

**Tech Stack**:
- Node.js/TypeScript
- Finnhub API client
- Redis caching
- Kafka producer

**API Endpoints**:
```typescript
GET  /api/us/stocks/:symbol           // Get US stock (AAPL, TSLA, etc.)
GET  /api/us/stocks/:symbol/quote     // Real-time quote
GET  /api/us/stocks/:symbol/news      // Stock news
GET  /api/us/search?q=tesla           // Search stocks
```

**Kafka Topics**:
- Produces: `us-stock-updates`, `us-stock-news`

**Finnhub Integration**:
```typescript
// Example: Fetch real-time quote
const quote = await finnhub.quote('AAPL');
// Cache in Redis for 5 minutes
await redis.setex(`us:quote:AAPL`, 300, JSON.stringify(quote));
// Publish to Kafka
await kafka.send({
  topic: 'us-stock-updates',
  messages: [{ value: JSON.stringify(quote) }]
});
```

**Benefits**:
- ✅ Centralized API key management
- ✅ Redis caching reduces Finnhub API calls
- ✅ Rate limiting protection
- ✅ Consistent data format across MSE and US stocks
- ✅ Event-driven updates to all consumers

---

### 3. TradingView Widget (Keep in Frontend)

**Status**: ✅ **Stays Client-Side**

**Why keep it in frontend?**
- It's a client-side JavaScript library
- Loads data directly from TradingView servers
- No backend needed
- Great for visual charts

**Usage in Next.js**:
```tsx
// components/TradingViewChart.tsx
import { useEffect, useRef } from 'react';

export default function TradingViewChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      new TradingView.widget({
        container_id: containerRef.current.id,
        symbol: symbol,
        interval: 'D',
        theme: 'dark',
        // ... other config
      });
    }
  }, [symbol]);

  return <div ref={containerRef} id="tradingview-chart" />;
}
```

**Keep it simple**: TradingView already handles US stock data beautifully. No backend needed!

---

## 🔄 Data Flow Examples

### Example 1: User Asks "What's the price of AAPL?"

1. **Frontend** → Send to Kafka `user-requests` topic
2. **Orchestrator Agent** → Classifies intent as `market_analysis`
3. **Market Analysis Agent** → Queries US Market Data Service
4. **US Market Data Service** → 
   - Check Redis cache
   - If miss: Call Finnhub API
   - Cache result
   - Return data
5. **Response** → Back to user via `user-responses` topic

### Example 2: User Asks "What's the price of MNP (Mongolian Post)?"

1. **Frontend** → Send to Kafka `user-requests` topic
2. **Orchestrator Agent** → Classifies intent as `market_analysis`
3. **Market Analysis Agent** → Queries MSE Data Service
4. **MSE Data Service** → 
   - Query PostgreSQL (already loaded!)
   - Return latest data
5. **Response** → Back to user

### Example 3: User Views TradingView Chart for TSLA

1. **Frontend** → Direct TradingView widget load
2. **TradingView** → Fetches data from their servers
3. **No backend involvement** → Pure client-side

---

## 🎓 Benefits for Your Thesis

### 1. **Event-Driven Architecture**
- ✅ Loose coupling between data sources
- ✅ Microservices communicate via Kafka
- ✅ Easy to add new data sources

### 2. **Separation of Concerns**
- ✅ MSE Service handles Mongolian stocks
- ✅ US Service handles American stocks
- ✅ Each service is independent

### 3. **Scalability**
- ✅ Scale MSE and US services independently
- ✅ Redis caching reduces API costs
- ✅ Kafka handles high message throughput

### 4. **Real-World Architecture**
- ✅ Demonstrates microservice best practices
- ✅ Shows proper API integration patterns
- ✅ Includes caching strategies

---

## 📋 Implementation Priority

### Phase 1: Foundation ✅ (Completed)
- [x] Kafka infrastructure
- [x] PostgreSQL schema
- [x] MSE Data Service
- [x] Orchestrator Agent

### Phase 2: Market Data ⏳ (Recommended Next)
- [ ] Build US Market Data Service
- [ ] Integrate Finnhub API
- [ ] Add Redis caching
- [ ] Create unified API endpoints

### Phase 3: Agents (After Phase 2)
- [ ] Portfolio Advisor Agent (uses both MSE + US data)
- [ ] Market Analysis Agent (compares MSE vs US markets)
- [ ] News Intelligence Agent (aggregates news from both)

---

## 💡 Key Design Decisions

### Should Finnhub be in Frontend or Backend?

**❌ Frontend (Current)**:
```
Frontend → Finnhub API (direct)
Problems:
- API key exposed to browser
- No caching (expensive)
- Rate limits per user session
- Hard to monitor usage
```

**✅ Backend (Recommended)**:
```
Frontend → Backend API → Redis Cache → Finnhub API
Benefits:
- API key secure
- Redis caching (90% cache hit = 10x fewer API calls)
- Rate limiting protection
- Centralized monitoring
- Consistent with MSE architecture
```

### TradingView Widget?

**Keep in Frontend!** ✅
- It's designed for client-side use
- Has its own data streaming
- No backend needed
- Works great as-is

---

## 🚀 Next Steps

1. **Build US Market Data Service** (Node.js)
   - Finnhub API integration
   - Redis caching layer
   - Kafka producer
   - REST API endpoints

2. **Update Frontend** to use Backend API
   - Replace direct Finnhub calls
   - Use unified API for both MSE and US stocks
   - Keep TradingView widget as-is

3. **Build Agents** that use both data sources
   - Portfolio Advisor (MSE + US stocks)
   - Market Analysis (compare markets)

Would you like me to:
1. **Build the US Market Data Service now?**
2. **Continue with Portfolio Advisor Agent first?** (can use mock US data initially)
3. **Something else?**

---

**Current Status**: 
- ✅ MSE Data: Fully integrated (52K records)
- ⏳ US Data: Needs dedicated service
- ✅ TradingView: Keep as-is (client-side)
- ✅ Orchestrator: Ready to route requests

