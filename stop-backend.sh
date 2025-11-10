#!/bin/bash

# Stop Script for AI Agents Microservice Architecture
# Usage: ./stop-backend.sh

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║         🛑 Stopping AI Agents Microservice Architecture 🛑          ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kill processes by PID file
if [ -f /tmp/thesis-backend-pids.txt ]; then
    echo "📋 Reading PIDs from file..."
    source /tmp/thesis-backend-pids.txt
    
    if [ ! -z "$API_GATEWAY_PID" ]; then
        echo "Stopping API Gateway (PID: $API_GATEWAY_PID)..."
        kill $API_GATEWAY_PID 2>/dev/null && echo -e "${GREEN}✅ Stopped${NC}" || echo -e "${YELLOW}⚠️  Already stopped${NC}"
    fi
    
    if [ ! -z "$ORCHESTRATOR_PID" ]; then
        echo "Stopping Orchestrator Agent (PID: $ORCHESTRATOR_PID)..."
        kill $ORCHESTRATOR_PID 2>/dev/null && echo -e "${GREEN}✅ Stopped${NC}" || echo -e "${YELLOW}⚠️  Already stopped${NC}"
    fi
    
    if [ ! -z "$INVESTMENT_PID" ]; then
        echo "Stopping Investment Agent (PID: $INVESTMENT_PID)..."
        kill $INVESTMENT_PID 2>/dev/null && echo -e "${GREEN}✅ Stopped${NC}" || echo -e "${YELLOW}⚠️  Already stopped${NC}"
    fi
    
    if [ ! -z "$NEWS_PID" ]; then
        echo "Stopping News Intelligence Agent (PID: $NEWS_PID)..."
        kill $NEWS_PID 2>/dev/null && echo -e "${GREEN}✅ Stopped${NC}" || echo -e "${YELLOW}⚠️  Already stopped${NC}"
    fi
    
    if [ ! -z "$NOTIFICATION_PID" ]; then
        echo "Stopping Notification Agent (PID: $NOTIFICATION_PID)..."
        kill $NOTIFICATION_PID 2>/dev/null && echo -e "${GREEN}✅ Stopped${NC}" || echo -e "${YELLOW}⚠️  Already stopped${NC}"
    fi
    
    if [ ! -z "$RAG_PID" ]; then
        echo "Stopping RAG Service (PID: $RAG_PID)..."
        kill $RAG_PID 2>/dev/null && echo -e "${GREEN}✅ Stopped${NC}" || echo -e "${YELLOW}⚠️  Already stopped${NC}"
    fi
    
    rm /tmp/thesis-backend-pids.txt
fi

# Fallback: kill by process name
echo ""
echo "🧹 Cleaning up remaining processes..."
pkill -f "api-gateway" 2>/dev/null
pkill -f "orchestrator-agent" 2>/dev/null
pkill -f "investment-agent" 2>/dev/null
pkill -f "news-intelligence-agent" 2>/dev/null
pkill -f "notification-agent" 2>/dev/null
pkill -f "rag-service" 2>/dev/null

sleep 2

echo ""
echo -e "${GREEN}✅ All backend services stopped!${NC}"
echo ""
echo "To restart:"
echo "   ./start-backend.sh"
echo ""

