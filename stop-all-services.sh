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
echo -e "${BLUE}║               Stopping All Thesis Demo Services                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to stop a process
stop_process() {
    local pid=$1
    local name=$2
    
    if ps -p $pid > /dev/null 2>&1; then
        echo -e "${YELLOW}⏹️  Stopping $name (PID: $pid)...${NC}"
        kill $pid 2>/dev/null
        sleep 1
        
        # Force kill if still running
        if ps -p $pid > /dev/null 2>&1; then
            kill -9 $pid 2>/dev/null
        fi
        
        echo -e "${GREEN}✓ $name stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  $name (PID: $pid) not running${NC}"
    fi
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   PHASE 1: Stopping Backend Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Stop services from PID file
if [ -f "thesis-backend-pids.txt" ]; then
    while read pid; do
        if [ ! -z "$pid" ]; then
            stop_process $pid "Service"
        fi
    done < thesis-backend-pids.txt
    
    rm -f thesis-backend-pids.txt
    echo -e "${GREEN}✓ All backend services stopped${NC}"
else
    echo -e "${YELLOW}⚠️  No PID file found${NC}"
fi

echo ""

# Stop any remaining Node.js processes on our ports
echo -e "${YELLOW}🔍 Checking for processes on known ports...${NC}"
for port in 3000 3001 3002 3003 3004 3005 3006 3007; do
    if lsof -ti:$port > /dev/null 2>&1; then
        echo -e "${YELLOW}⏹️  Stopping process on port $port...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✓ Port $port cleared${NC}"
    fi
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   PHASE 2: Stopping Docker Compose Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$PROJECT_ROOT/backend"
echo -e "${YELLOW}🐳 Stopping Docker Compose...${NC}"
docker-compose down

echo -e "${GREEN}✓ Docker Compose services stopped${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║               ✅ ALL SERVICES STOPPED ✅                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}💡 To start services again, run:${NC} ./start-all-services.sh"
echo ""
