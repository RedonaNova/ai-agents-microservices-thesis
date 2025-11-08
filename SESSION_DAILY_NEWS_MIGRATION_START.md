# Daily News Agent Migration - Session Start
**Date**: November 8, 2025  
**Status**: 🚧 **IN PROGRESS**

---

## 🎯 Current Session Goals

Migrate the Daily News functionality from Inngest to Kafka-based Daily News Agent:

1. ✅ **Welcome Email Agent** - COMPLETED & TESTED
2. 🚧 **Daily News Agent** - IN PROGRESS
3. ⏳ **Remove Inngest** - Pending
4. ⏳ **Frontend UI** - Pending

---

## 📊 Progress So Far Today

### Completed:
1. ✅ API Gateway tested with all agents (100% success rate)
2. ✅ Fixed Portfolio Advisor Agent bugs
3. ✅ Built Welcome Email Agent (1,100+ LOC)
4. ✅ Tested Welcome Email end-to-end (email delivered!)
5. ✅ Migrated frontend auth.actions.ts from Inngest to API Gateway

### Currently Building:
- 🚧 Daily News Agent structure
- 🚧 MongoDB integration for user/watchlist data
- 🚧 News fetching & summarization
- 🚧 Cron scheduling (daily at 12:00 PM)

---

## 🎯 Daily News Agent Architecture

```
┌──────────────────┐
│   Node-Cron      │  Trigger: Daily at 12:00 PM
│   Scheduler      │  Or: Manual Kafka event
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Daily News      │  1. Fetch all users from MongoDB
│  Agent           │  2. Get watchlist for each user
└────────┬─────────┘  3. Fetch news (News Intelligence Agent)
         │            4. Summarize with Gemini AI
         ├──→ MongoDB (Users + Watchlists)
         │
         ├──→ News Intelligence Agent (Kafka)
         │    or Finnhub API (fallback)
         │
         ├──→ Gemini AI (Summarize news)
         │
         └──→ Nodemailer (Send emails)
              ↓
         Kafka (user-responses)
```

---

## 📁 Files Created (Daily News Agent)

| File | Status | Purpose |
|------|--------|---------|
| `package.json` | ✅ | Dependencies (mongoose, node-cron, nodemailer) |
| `src/types.ts` | ✅ | Type definitions |
| `src/logger.ts` | ✅ | Winston logger |
| `src/mongodb.ts` | ⏳ | MongoDB connection & queries |
| `src/news-fetcher.ts` | ⏳ | Fetch news for symbols |
| `src/gemini-client.ts` | ⏳ | AI summarization |
| `src/email-service.ts` | ⏳ | Send news emails |
| `src/scheduler.ts` | ⏳ | Cron job setup |
| `src/index.ts` | ⏳ | Main agent logic |

---

## 🔄 Key Differences from Inngest Version

### Inngest (Old):
```typescript
export const sendDailyNewsSummary = inngest.createFunction(
  { id: "daily-news-summary" },
  [{ event: "app/send.daily.news" }, { cron: "0 12 * * *" }],
  async ({ step }) => {
    // Inngest orchestrates everything
  }
);
```

### Kafka + Node-Cron (New):
```typescript
// Cron scheduler
cron.schedule('0 12 * * *', async () => {
  // Trigger daily news job
  await sendDailyNewsJob();
});

// Or manual trigger via Kafka event
consumer.on('daily-news-trigger', async () => {
  await sendDailyNewsJob();
});
```

**Benefits**:
- More control over scheduling
- Can trigger manually via Kafka
- Decoupled from Inngest dependency
- Better logging & monitoring
- Scalable architecture

---

## 📝 Implementation Plan

### Step 1: MongoDB Integration ⏳
- Connect to MongoDB
- Define User & Watchlist models
- Query functions:
  - `getAllUsersForNews()` - Get all users with email
  - `getWatchlistByUserId()` - Get user's watchlist symbols

### Step 2: News Fetching ⏳
- Option A: Use News Intelligence Agent (via Kafka)
- Option B: Direct Finnhub API call (fallback)
- Return news articles for given symbols

### Step 3: AI Summarization ⏳
- Use Gemini 2.0 Flash
- Reuse `NEWS_SUMMARY_EMAIL_PROMPT` from frontend
- Generate HTML news summary

### Step 4: Email Service ⏳
- Reuse Nodemailer setup from Welcome Email Agent
- Use `NEWS_SUMMARY_EMAIL_TEMPLATE`
- Send to all users with summaries

### Step 5: Scheduler ⏳
- Set up node-cron: `0 12 * * *` (daily at noon)
- Add manual trigger via Kafka event
- Graceful error handling

### Step 6: Testing ⏳
- Test with Kafka manual trigger
- Test with single user
- Test with multiple users
- Verify email delivery
- Check Gemini AI summaries

---

## 🎓 Key Learnings from Welcome Email Agent

### What Worked Well:
1. ✅ **Absolute path for dotenv**: `/home/it/apps/thesis-report/backend/.env`
2. ✅ **Load dotenv at top of each file** that uses env vars
3. ✅ **Named imports** for nodemailer: `import { createTransport }`
4. ✅ **Graceful error handling** with fallbacks
5. ✅ **Comprehensive logging** for debugging

### Apply to Daily News Agent:
- Load .env at top of mongodb.ts, gemini-client.ts, email-service.ts
- Use absolute path for dotenv
- Add detailed logging for each step
- Handle MongoDB connection failures gracefully
- Fallback to Finnhub API if News Intelligence Agent fails

---

## 📊 Expected Daily News Agent Stats

**Files**: ~10 files  
**Lines of Code**: ~1,200 LOC  
**Dependencies**: mongoose, node-cron, nodemailer, kafkajs, gemini  
**Processing Time**: 10-30 seconds per batch (depends on # users)  
**Email Delivery**: 2-5 seconds per email  

---

## 🧪 Testing Strategy

### Unit Tests:
1. MongoDB connection & queries
2. News fetching (mock Finnhub API)
3. Gemini AI summarization
4. Email template generation

### Integration Tests:
1. Full flow with 1 test user
2. Full flow with 3 test users
3. Manual Kafka trigger
4. Cron schedule (test with `*/5 * * * *` - every 5 min)

### End-to-End Test:
1. Wait for scheduled run (12:00 PM)
2. Check all users receive emails
3. Verify email content is personalized
4. Check Kafka responses
5. Monitor agent logs

---

## 🔗 Related Components

### Reusing from Welcome Email Agent:
- ✅ SMTP configuration
- ✅ Nodemailer setup
- ✅ Gemini AI client pattern
- ✅ Kafka producer/consumer setup
- ✅ Dotenv loading strategy

### New Components:
- MongoDB connection (Mongoose)
- Watchlist queries
- News fetching logic
- Cron scheduler
- News summary email template

---

## 📚 Reference Files

**Frontend (for understanding)**:
- `/frontend/lib/inngest/functions.ts` - Original Inngest function
- `/frontend/lib/inngest/prompts.ts` - News summary prompt
- `/frontend/lib/nodemailer/templates-en.ts` - Email template
- `/frontend/lib/actions/user.actions.ts` - User queries
- `/frontend/lib/actions/watchlist.actions.ts` - Watchlist queries
- `/frontend/lib/actions/finnhub.actions.ts` - News fetching

**Backend (to build)**:
- `/backend/daily-news-agent/src/*` - New agent files
- `/backend/.env` - Shared configuration

---

## 🎯 Success Criteria

### Agent is complete when:
- [ ] Connects to MongoDB successfully
- [ ] Fetches all users with emails
- [ ] Gets watchlist for each user
- [ ] Fetches news for symbols
- [ ] Generates AI summaries
- [ ] Sends emails via SMTP
- [ ] Runs on cron schedule
- [ ] Responds to manual Kafka triggers
- [ ] Logs all operations
- [ ] Handles errors gracefully

### Testing is complete when:
- [ ] Manual trigger works
- [ ] Email delivered to test user
- [ ] AI summary is relevant
- [ ] Cron schedule works
- [ ] Multiple users handled correctly
- [ ] No memory leaks
- [ ] Error cases handled

---

## 🚀 Next Actions

1. ⏳ Build MongoDB service (users + watchlists)
2. ⏳ Create news fetcher (Finnhub integration)
3. ⏳ Set up Gemini AI summarization
4. ⏳ Build email service (reuse templates)
5. ⏳ Add cron scheduler
6. ⏳ Test end-to-end
7. ⏳ Document & deploy

---

**Status**: 🚧 Building MongoDB integration  
**Next**: Complete mongodb.ts with user & watchlist queries  
**ETA**: ~2 hours for complete Daily News Agent

