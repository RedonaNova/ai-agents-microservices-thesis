#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Orchestrator Agent Status Check               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if process is running
echo -e "${YELLOW}1. Checking if orchestrator process is running...${NC}"
ORCH_PIDS=$(ps aux | grep "orchestrator-agent" | grep -v grep | awk '{print $2}')
if [ -z "$ORCH_PIDS" ]; then
    echo -e "${RED}✗ Orchestrator process NOT found${NC}"
else
    echo -e "${GREEN}✓ Orchestrator is running (PIDs: $ORCH_PIDS)${NC}"
fi
echo ""

# Check logs
echo -e "${YELLOW}2. Checking recent logs...${NC}"
if [ -f "logs/orchestrator-agent.log" ]; then
    echo "   Last 10 lines:"
    tail -10 logs/orchestrator-agent.log | sed 's/^/   /'
else
    echo -e "${RED}   No log file found${NC}"
fi
echo ""

# Check Kafka consumer groups
echo -e "${YELLOW}3. Checking Kafka consumer groups...${NC}"
docker exec thesis-kafka kafka-consumer-groups \
    --bootstrap-server localhost:9092 \
    --list 2>/dev/null | grep orchestrator

echo ""

# Check consumer group details
echo -e "${YELLOW}4. Checking orchestrator-group details...${NC}"
docker exec thesis-kafka kafka-consumer-groups \
    --bootstrap-server localhost:9092 \
    --describe \
    --group orchestrator-group 2>/dev/null || echo "   No consumer group found"

echo ""

# Check monitoring API
echo -e "${YELLOW}5. Checking monitoring API status...${NC}"
curl -s http://localhost:3001/api/monitoring/agents | jq -r '.agents[] | select(.id=="orchestrator") | "   Status: \(.status)\n   Consumer Group: \(.consumerGroup)\n   Last Seen: \(.lastSeen)"'

echo ""

# Check if orchestrator is actually processing messages
echo -e "${YELLOW}6. Checking if orchestrator can process messages...${NC}"
echo "   Sending test query..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "test query", "type": "market"}')

REQUEST_ID=$(echo $RESPONSE | jq -r '.requestId')
echo "   Request ID: $REQUEST_ID"

sleep 3

# Check log for this request
if grep -q "$REQUEST_ID" logs/orchestrator-agent.log 2>/dev/null; then
    echo -e "${GREEN}✓ Orchestrator IS processing messages!${NC}"
else
    echo -e "${YELLOW}⚠️  Request ID not found in logs yet (might need more time)${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   DIAGNOSIS:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ ! -z "$ORCH_PIDS" ] && grep -q "$REQUEST_ID" logs/orchestrator-agent.log 2>/dev/null; then
    echo -e "${GREEN}✅ Orchestrator is WORKING correctly${NC}"
    echo "   The 'inactive' status in monitoring may just be a delay in consumer group registration."
    echo "   The orchestrator is actually processing messages successfully."
elif [ ! -z "$ORCH_PIDS" ]; then
    echo -e "${YELLOW}⚠️  Orchestrator process is running but may not be consuming messages${NC}"
    echo "   Check logs: tail -f logs/orchestrator-agent.log"
else
    echo -e "${RED}✗ Orchestrator is NOT running${NC}"
    echo "   Start it with: cd backend/orchestrator-agent && npm run dev"
fi

echo ""

