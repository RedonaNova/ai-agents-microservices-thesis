#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Stopping Thesis Demo - All Services                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Stop backend services using PID file
if [ -f "thesis-backend-pids.txt" ]; then
    echo -e "${YELLOW}🛑 Stopping Backend Services...${NC}"
    while IFS= read -r pid; do
        if ps -p $pid > /dev/null 2>&1; then
            echo "   Stopping process $pid..."
            kill $pid 2>/dev/null
            # Wait for graceful shutdown
            sleep 1
            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                kill -9 $pid 2>/dev/null
            fi
        fi
    done < thesis-backend-pids.txt
    rm thesis-backend-pids.txt
    echo -e "${GREEN}✓ Backend services stopped${NC}"
else
    echo -e "${YELLOW}⚠ No PID file found, using fallback methods...${NC}"
fi

echo ""
echo -e "${YELLOW}🧹 Cleaning up any remaining processes...${NC}"

# Fallback: kill by process name patterns
pkill -f "orchestrator-agent" 2>/dev/null && echo "   ✓ Killed orchestrator-agent"
pkill -f "investment-agent" 2>/dev/null && echo "   ✓ Killed investment-agent"
pkill -f "news-intelligence-agent" 2>/dev/null && echo "   ✓ Killed news-intelligence-agent"
pkill -f "notification-agent" 2>/dev/null && echo "   ✓ Killed notification-agent"
pkill -f "rag-service" 2>/dev/null && echo "   ✓ Killed rag-service"
pkill -f "api-gateway" 2>/dev/null && echo "   ✓ Killed api-gateway"

# Kill frontend if running on port 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "   ✓ Killing process on port 3000 (frontend)"
    lsof -ti:3000 | xargs kill -9 2>/dev/null
fi

echo ""
echo -e "${YELLOW}🐳 Stopping Docker Compose services...${NC}"
cd "$PROJECT_ROOT/backend"
docker-compose down

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ ALL SERVICES STOPPED ✅                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}💡 To start services again, run:${NC} ./start-all-services.sh"
echo ""

