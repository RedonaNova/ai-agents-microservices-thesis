#!/bin/bash

# Startup Script for AI Agents Microservice Architecture
# Usage: ./start-backend.sh

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║        🚀 Starting AI Agents Microservice Architecture 🚀           ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kill existing processes
echo "🧹 Cleaning up old processes..."
pkill -f "api-gateway" 2>/dev/null
pkill -f "orchestrator-agent" 2>/dev/null
pkill -f "investment-agent" 2>/dev/null
pkill -f "news-intelligence-agent" 2>/dev/null
pkill -f "notification-agent" 2>/dev/null
sleep 2

# Check if Docker services are running
echo ""
echo "🐳 Checking Docker services..."
if ! docker ps | grep -q "thesis-kafka"; then
    echo -e "${RED}❌ Kafka is not running!${NC}"
    echo "   Run: docker-compose up -d"
    exit 1
fi
echo -e "${GREEN}✅ Kafka is running${NC}"

if ! docker ps | grep -q "thesis-postgres"; then
    echo -e "${RED}❌ PostgreSQL is not running!${NC}"
    echo "   Run: docker-compose up -d"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is running${NC}"

# Create log directory
mkdir -p /tmp/thesis-logs

# Start API Gateway
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Starting API Gateway..."
cd /home/it/apps/thesis-report/backend/api-gateway
npx tsx src/index.ts > /tmp/thesis-logs/api-gateway.log 2>&1 &
API_GATEWAY_PID=$!
echo -e "${GREEN}✅ API Gateway started (PID: $API_GATEWAY_PID)${NC}"
echo "   Log: /tmp/thesis-logs/api-gateway.log"

# Start Orchestrator Agent
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Starting Orchestrator Agent..."
cd /home/it/apps/thesis-report/backend/orchestrator-agent
npx tsx src/index.ts > /tmp/thesis-logs/orchestrator-agent.log 2>&1 &
ORCHESTRATOR_PID=$!
echo -e "${GREEN}✅ Orchestrator Agent started (PID: $ORCHESTRATOR_PID)${NC}"
echo "   Log: /tmp/thesis-logs/orchestrator-agent.log"

# Start Investment Agent
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💼 Starting Investment Agent..."
cd /home/it/apps/thesis-report/backend/investment-agent
npx tsx src/index.ts > /tmp/thesis-logs/investment-agent.log 2>&1 &
INVESTMENT_PID=$!
echo -e "${GREEN}✅ Investment Agent started (PID: $INVESTMENT_PID)${NC}"
echo "   Log: /tmp/thesis-logs/investment-agent.log"

# Start News Intelligence Agent
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📰 Starting News Intelligence Agent..."
cd /home/it/apps/thesis-report/backend/news-intelligence-agent
npx tsx src/index.ts > /tmp/thesis-logs/news-intelligence-agent.log 2>&1 &
NEWS_PID=$!
echo -e "${GREEN}✅ News Intelligence Agent started (PID: $NEWS_PID)${NC}"
echo "   Log: /tmp/thesis-logs/news-intelligence-agent.log"

# Start Notification Agent
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📧 Starting Notification Agent..."
cd /home/it/apps/thesis-report/backend/notification-agent
npx tsx src/index.ts > /tmp/thesis-logs/notification-agent.log 2>&1 &
NOTIFICATION_PID=$!
echo -e "${GREEN}✅ Notification Agent started (PID: $NOTIFICATION_PID)${NC}"
echo "   Log: /tmp/thesis-logs/notification-agent.log"

# Start RAG Service
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧠 Starting RAG Service (Mongolian)..."
cd /home/it/apps/thesis-report/backend/rag-service
npx tsx src/index.ts > /tmp/thesis-logs/rag-service.log 2>&1 &
RAG_PID=$!
echo -e "${GREEN}✅ RAG Service started (PID: $RAG_PID)${NC}"
echo "   Log: /tmp/thesis-logs/rag-service.log"

# Wait for all agents to start
echo ""
echo "⏳ Waiting for agents to initialize..."
sleep 5

# Check if all processes are still running
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Health Check:"
echo ""

check_process() {
    local pid=$1
    local name=$2
    if ps -p $pid > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name is running (PID: $pid)${NC}"
        return 0
    else
        echo -e "${RED}❌ $name failed to start!${NC}"
        return 1
    fi
}

ALL_OK=true
check_process $API_GATEWAY_PID "API Gateway" || ALL_OK=false
check_process $ORCHESTRATOR_PID "Orchestrator Agent" || ALL_OK=false
check_process $INVESTMENT_PID "Investment Agent" || ALL_OK=false
check_process $NEWS_PID "News Intelligence Agent" || ALL_OK=false
check_process $NOTIFICATION_PID "Notification Agent" || ALL_OK=false
check_process $RAG_PID "RAG Service" || ALL_OK=false

echo ""
if [ "$ALL_OK" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${GREEN}🎉 ALL SERVICES STARTED SUCCESSFULLY! 🎉${NC}"
    echo ""
    echo "📡 Endpoints:"
    echo "   API Gateway: http://localhost:3001"
    echo "   Health Check: curl http://localhost:3001/health"
    echo ""
    echo "📋 Logs:"
    echo "   tail -f /tmp/thesis-logs/*.log"
    echo ""
    echo "🛑 To stop all services:"
    echo "   ./stop-backend.sh"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${RED}⚠️  SOME SERVICES FAILED TO START!${NC}"
    echo ""
    echo "Check logs for details:"
    echo "   tail -100 /tmp/thesis-logs/*.log"
    echo ""
fi

# Save PIDs to file for stop script
cat > /tmp/thesis-backend-pids.txt << EOF
API_GATEWAY_PID=$API_GATEWAY_PID
ORCHESTRATOR_PID=$ORCHESTRATOR_PID
INVESTMENT_PID=$INVESTMENT_PID
NEWS_PID=$NEWS_PID
NOTIFICATION_PID=$NOTIFICATION_PID
RAG_PID=$RAG_PID
EOF

echo ""
echo "PIDs saved to: /tmp/thesis-backend-pids.txt"

