#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Testing Investment Agent with APU Stock Query     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check if API Gateway is running
echo -e "${YELLOW}📡 Checking API Gateway...${NC}"
if curl -s -f http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API Gateway is running${NC}"
else
    echo -e "${RED}✗ API Gateway is not running!${NC}"
    echo "   Start it with: cd backend/api-gateway && npm run dev"
    exit 1
fi

echo ""

# Step 2: Check agent status
echo -e "${YELLOW}🤖 Checking agent status...${NC}"
curl -s http://localhost:3001/api/monitoring/agents | jq -r '.agents[] | "   \(.name): \(.status)"'

echo ""

# Step 3: Send APU query
echo -e "${YELLOW}📤 Sending APU stock analysis query...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3001/api/agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Analyze APU stock. Show me the recent price and volume.", "type": "market"}')

REQUEST_ID=$(echo $RESPONSE | jq -r '.requestId')

if [ "$REQUEST_ID" = "null" ] || [ -z "$REQUEST_ID" ]; then
    echo -e "${RED}✗ Failed to send query${NC}"
    echo "$RESPONSE" | jq
    exit 1
fi

echo -e "${GREEN}✓ Query sent successfully${NC}"
echo "   Request ID: $REQUEST_ID"
echo ""

# Step 4: Wait for processing
echo -e "${YELLOW}⏳ Waiting for AI to process (12 seconds)...${NC}"
for i in {12..1}; do
    echo -n "$i..."
    sleep 1
done
echo ""
echo ""

# Step 5: Poll for response
echo -e "${YELLOW}📥 Fetching response...${NC}"
RESULT=$(curl -s "http://localhost:3001/api/agent/response/$REQUEST_ID")

FOUND=$(echo $RESULT | jq -r '.found')

if [ "$FOUND" = "true" ]; then
    echo -e "${GREEN}✅ Response received!${NC}"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}   INVESTMENT AGENT RESPONSE:${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "$RESULT" | jq -r '.response' | head -50
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Check if response contains MSE data
    if echo "$RESULT" | jq -r '.response' | grep -q "APU\|₮\|MNT\|Volume"; then
        echo -e "${GREEN}✓ Response contains MSE stock data!${NC}"
    else
        echo -e "${YELLOW}⚠️  Response may not contain actual MSE data${NC}"
    fi
else
    echo -e "${YELLOW}⏳ Response not ready yet. Try polling again:${NC}"
    echo "   curl http://localhost:3001/api/agent/response/$REQUEST_ID | jq '.response'"
fi

echo ""
echo -e "${BLUE}📊 Full response metadata:${NC}"
echo "$RESULT" | jq '{found, requestId, agentType, status, processingTimeMs}'

echo ""

