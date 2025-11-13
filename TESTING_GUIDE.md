# 🧪 Complete Testing Guide

**Date**: November 12, 2025  
**Status**: ✅ All fixes applied, ready to test

---

## ✅ What's Been Fixed

### 1. **start-all-services.sh** - Corrupted line fixed ✅
- **Problem**: Line 12 had pasted text corrupting the script
- **Fixed**: Removed the extra text

### 2. **Monitoring API** - Consumer group mismatch fixed ✅
- **Problem**: Orchestrator showing as "inactive"
- **Root Cause**: Monitoring API checked for `orchestrator-agent-group` but orchestrator uses `orchestrator-group`
- **Fixed**: Updated monitoring.routes.ts to match correct group name

### 3. **Orchestrator Build** - All TypeScript errors fixed ✅
- **Fixed**: intent-classifier.ts null check
- **Fixed**: Deleted unused request-processor.ts

### 4. **Investment Agent** - Enhanced prompts ✅
- **Updated**: Now explicitly uses MSE database data in responses
- **Includes**: Stock symbols, prices (₮), volumes, and change percentages

---

## 🧪 How to Test (In New Terminal)

### Option 1: Automated Test Script (Recommended)

```bash
# Open a NEW terminal
cd /home/it/apps/thesis-report

# Make script executable
chmod +x test-apu-query.sh

# Run the test
./test-apu-query.sh
```

**What it does**:
- ✅ Checks API Gateway is running
- ✅ Shows agent status
- ✅ Sends APU stock query
- ✅ Waits 12 seconds
- ✅ Fetches and displays response
- ✅ Checks if response contains MSE data

---

### Option 2: Manual Testing

```bash
# In new terminal
cd /home/it/apps/thesis-report

# Step 1: Send query
curl -X POST http://localhost:3001/api/agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Analyze APU stock. Show me the recent price and volume.", "type": "market"}' | jq

# Copy the requestId from the response

# Step 2: Wait 10-12 seconds
sleep 12

# Step 3: Get response (replace REQUEST_ID with the actual ID)
curl http://localhost:3001/api/agent/response/REQUEST_ID | jq '.response'
```

---

## 🔍 Check Orchestrator Status

```bash
# Make script executable
chmod +x check-orchestrator-status.sh

# Run diagnosis
./check-orchestrator-status.sh
```

**This checks**:
- Process status
- Recent logs
- Kafka consumer groups
- Actual message processing
- Monitoring API status

---

## 📊 Check All Agents Status

```bash
curl http://localhost:3001/api/monitoring/agents | jq '.agents'
```

**Expected result** (after fixing):
```json
{
  "id": "orchestrator",
  "name": "Orchestrator Agent",
  "status": "active",  ← Should be "active" now!
  "consumerGroup": "orchestrator-group",
  "lastSeen": "Active now"
}
```

---

## 🎯 What to Look For in Test Results

### ✅ SUCCESS Indicators:

1. **Response contains MSE data**:
   - Stock symbols: APU, TDB, ERDENET, TAVT, GOLOMT, MOBICOM
   - Prices in ₮ (Tugrik) or MNT
   - Volume numbers (e.g., 125,000 shares)
   - Percentage changes

2. **Response is specific**:
   - Mentions actual price (e.g., "₮1,280")
   - Mentions trading volume
   - Refers to recent trading dates
   - Provides data-driven analysis

### ❌ FAILURE Indicators:

1. **Generic response**:
   - "I don't have access to data"
   - No specific numbers
   - No stock symbols mentioned
   - Generic investment advice without data

---

## 🐛 If Tests Fail

### Problem: API Gateway not running
```bash
cd /home/it/apps/thesis-report/backend/api-gateway
npm run dev
```

### Problem: Orchestrator not running
```bash
cd /home/it/apps/thesis-report/backend/orchestrator-agent
npm run dev
```

### Problem: Investment Agent not running
```bash
cd /home/it/apps/thesis-report/backend/investment-agent
npm run dev
```

### Problem: Database not seeded
```bash
# Check seed data
docker exec -it thesis-postgres psql -U thesis_user -d thesis_db \
  -c "SELECT symbol, name, sector FROM mse_companies WHERE symbol IN ('APU', 'TDB', 'ERDENET');"

# Expected: 3 rows with data
```

---

## 📁 Log Files

View real-time logs:

```bash
# API Gateway
tail -f logs/api-gateway.log

# Orchestrator
tail -f logs/orchestrator-agent.log

# Investment Agent
tail -f logs/investment-agent.log
```

---

## 🚀 After Successful Test

Once the APU query works with real MSE data:

### ✅ Completed:
1. Orchestrator fixed (generateText → generateResponse)
2. Investment Agent enhanced (uses real MSE data)
3. MSE database seeded (6 companies, 30 trading records)
4. Monitoring API fixed (consumer group name)
5. Response polling tested (Option 1 complete)

### 📋 Remaining:
1. **Option 2**: News + Watchlist aggregation
2. **Option 3**: MSE trading history analysis
3. Test Knowledge Agent (RAG)
4. Test News Agent
5. Final verification

---

## 💡 Quick Reference Commands

```bash
# Test APU query (automated)
./test-apu-query.sh

# Check orchestrator status
./check-orchestrator-status.sh

# Check all agents
curl http://localhost:3001/api/monitoring/agents | jq

# View logs
tail -f logs/orchestrator-agent.log

# Restart API Gateway (if needed)
pkill -f "api-gateway.*tsx" && cd backend/api-gateway && npm run dev &

# Check Kafka consumer groups
docker exec thesis-kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list
```

---

**Ready to test! Run `./test-apu-query.sh` in a new terminal.** 🚀
