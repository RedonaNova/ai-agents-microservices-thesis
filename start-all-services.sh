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
echo -e "${BLUE}║       Starting Thesis Demo - Event-Driven Architecture          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
    return $?
}

# Function to wait for a service
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=30
    local attempt=0

    echo -e "${YELLOW}⏳ Waiting for $service_name...${NC}"
    while [ $attempt -lt $max_attempts ]; do
        if nc -z $host $port 2>/dev/null; then
            echo -e "${GREEN}✓ $service_name is ready${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    echo -e "${RED}✗ $service_name failed to start${NC}"
    return 1
}

# Function to wait for HTTP endpoint
wait_for_http() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0

    echo -e "${YELLOW}⏳ Waiting for $service_name...${NC}"
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service_name is ready${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    echo -e "${RED}✗ $service_name failed to start${NC}"
    return 1
}

# Clean up old PIDs
rm -f thesis-backend-pids.txt

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   PHASE 1: Infrastructure Services (Docker Compose)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd backend

# Start Docker Compose
echo -e "${YELLOW}🐳 Starting Docker Compose services...${NC}"
docker-compose up -d

# Wait for services
echo ""
wait_for_service localhost 2181 "Zookeeper"
wait_for_service localhost 9092 "Kafka"
wait_for_service localhost 5432 "PostgreSQL"
wait_for_service localhost 6333 "Qdrant"
wait_for_service localhost 6379 "Redis"
wait_for_service localhost 27017 "MongoDB"
wait_for_service localhost 8081 "Flink JobManager"

echo ""
echo -e "${GREEN}✓ All infrastructure services are running${NC}"
echo ""

# Check Docker services status
echo -e "${YELLOW}📊 Docker Services Status:${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   PHASE 2: Backend Agents${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$PROJECT_ROOT/backend"

# Function to start an agent
start_agent() {
    local agent_dir=$1
    local agent_name=$2
    local port=$3

    echo -e "${YELLOW}🤖 Starting $agent_name...${NC}"
    cd "$agent_dir"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "   Installing dependencies..."
        npm install > /dev/null 2>&1
    fi

    # Start the agent
    npm run dev > "$PROJECT_ROOT/logs/${agent_name}.log" 2>&1 &
    local pid=$!
    echo "$pid" >> "$PROJECT_ROOT/thesis-backend-pids.txt"
    echo -e "${GREEN}✓ $agent_name started (PID: $pid)${NC}"
}

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Start agents
start_agent "$PROJECT_ROOT/backend/orchestrator-agent" "orchestrator-agent" 3002
sleep 2
start_agent "$PROJECT_ROOT/backend/investment-agent" "investment-agent" 3003
sleep 1
start_agent "$PROJECT_ROOT/backend/news-intelligence-agent" "news-intelligence-agent" 3004
sleep 1
start_agent "$PROJECT_ROOT/backend/notification-agent" "notification-agent" 3005
sleep 1
start_agent "$PROJECT_ROOT/backend/rag-service" "rag-service" 3006

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   PHASE 3: API Gateway${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$PROJECT_ROOT/backend/api-gateway"
echo -e "${YELLOW}🌐 Starting API Gateway...${NC}"
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install > /dev/null 2>&1
fi

npm run dev > "$PROJECT_ROOT/logs/api-gateway.log" 2>&1 &
API_GATEWAY_PID=$!
echo "$API_GATEWAY_PID" >> "$PROJECT_ROOT/thesis-backend-pids.txt"
echo -e "${GREEN}✓ API Gateway started (PID: $API_GATEWAY_PID)${NC}"

# Wait for API Gateway
wait_for_http "http://localhost:3001/health" "API Gateway"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   PHASE 4: Frontend${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$PROJECT_ROOT/frontend"
echo -e "${YELLOW}⚛️  Starting Frontend (Next.js)...${NC}"

# Kill any process on port 3000
if check_port 3000; then
    echo "   Killing existing process on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 2
fi

if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install > /dev/null 2>&1
fi

npm run dev > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >> "$PROJECT_ROOT/thesis-backend-pids.txt"
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait for frontend
wait_for_http "http://localhost:3000" "Frontend"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  ✅ ALL SERVICES STARTED ✅                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Service Endpoints:${NC}"
echo ""
echo -e "${GREEN}   Frontend:         ${NC}http://localhost:3000"
echo -e "${GREEN}   API Gateway:      ${NC}http://localhost:3001"
echo -e "${GREEN}   Kafka UI:         ${NC}http://localhost:8080"
echo -e "${GREEN}   Flink Dashboard:  ${NC}http://localhost:8081"
echo ""
echo -e "${BLUE}📁 Logs Directory:${NC}    $PROJECT_ROOT/logs/"
echo -e "${BLUE}🔧 PID File:${NC}          thesis-backend-pids.txt"
echo ""
echo -e "${YELLOW}💡 To stop all services, run:${NC} ./stop-all-services.sh"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

