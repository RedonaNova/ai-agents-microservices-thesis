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
echo -e "${BLUE}║     Thesis Demo - Event-Driven AI Agents Architecture v2.0      ║${NC}"
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

# Wait for core services
echo ""
wait_for_service localhost 2181 "Zookeeper"
wait_for_service localhost 9092 "Kafka"
wait_for_service localhost 5432 "PostgreSQL"
wait_for_service localhost 6379 "Redis"

echo ""
echo -e "${GREEN}✓ All infrastructure services are running${NC}"
echo ""

# Check Docker services status
echo -e "${YELLOW}📊 Docker Services Status:${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   PHASE 2: Kafka Topics Creation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📝 Creating Kafka topics...${NC}"
cd "$PROJECT_ROOT/backend/kafka"
chmod +x topics.sh
./topics.sh
echo -e "${GREEN}✓ Kafka topics created${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   PHASE 3: Backend Agents${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$PROJECT_ROOT/backend"

# Function to start an agent
start_agent() {
    local agent_dir=$1
    local agent_name=$2

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

# Start agents in order
echo -e "${YELLOW}Starting Orchestrator Agent...${NC}"
start_agent "$PROJECT_ROOT/backend/orchestrator-agent" "orchestrator-agent"
sleep 2

echo -e "${YELLOW}Starting Knowledge Agent (RAG)...${NC}"
start_agent "$PROJECT_ROOT/backend/knowledge-agent" "knowledge-agent"
sleep 1

echo -e "${YELLOW}Starting Investment Agent...${NC}"
start_agent "$PROJECT_ROOT/backend/investment-agent" "investment-agent"
sleep 1

echo -e "${YELLOW}Starting News Agent...${NC}"
start_agent "$PROJECT_ROOT/backend/news-agent" "news-agent"
sleep 1

# Start PyFlink Planner (Python)
echo -e "${YELLOW}🐍 Starting PyFlink Planner Agent...${NC}"
cd "$PROJECT_ROOT/backend/flink-planner"
if [ ! -d "venv" ]; then
    echo "   Creating Python virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -q -r requirements.txt
else
    source venv/bin/activate
fi

python planner_job.py > "$PROJECT_ROOT/logs/flink-planner.log" 2>&1 &
FLINK_PID=$!
echo "$FLINK_PID" >> "$PROJECT_ROOT/thesis-backend-pids.txt"
echo -e "${GREEN}✓ PyFlink Planner started (PID: $FLINK_PID)${NC}"
deactivate

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   PHASE 4: API Gateway${NC}"
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
echo -e "${BLUE}   PHASE 5: Frontend${NC}"
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
echo -e "${GREEN}   Frontend:              ${NC}http://localhost:3000"
echo -e "${GREEN}   API Gateway:           ${NC}http://localhost:3001"
echo -e "${GREEN}   Kafka UI:              ${NC}http://localhost:8080"
echo ""
echo -e "${BLUE}🤖 Backend Agents:${NC}"
echo ""
echo -e "   • Orchestrator Agent    (Kafka consumer)"
echo -e "   • Knowledge Agent       (Kafka consumer - RAG)"
echo -e "   • Investment Agent      (Kafka consumer)"
echo -e "   • News Agent            (Kafka consumer)"
echo -e "   • PyFlink Planner       (Kafka consumer/producer)"
echo ""
echo -e "${BLUE}📁 Logs Directory:${NC}         $PROJECT_ROOT/logs/"
echo -e "${BLUE}🔧 PID File:${NC}               thesis-backend-pids.txt"
echo ""
echo -e "${YELLOW}💡 To stop all services, run:${NC} ./stop-all-services.sh"
echo -e "${YELLOW}💡 To view logs:${NC}             tail -f logs/<service-name>.log"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
