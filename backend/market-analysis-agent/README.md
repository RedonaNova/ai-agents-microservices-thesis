# Market Analysis Agent

## Overview
Analyzes Mongolian Stock Exchange (MSE) market trends, identifies top/bottom performers, and provides AI-powered market insights using Gemini 2.0 Flash.

## Features
- Real-time market overview (gainers/losers, average change)
- Top 5 performers identification
- Bottom 5 performers identification
- AI-generated market insights and trading opportunities
- Sector analysis capabilities

## Architecture
- **Input Topic**: `market-analysis-events`
- **Output Topic**: `user-responses`
- **Consumer Group**: `market-analysis-group`
- **LLM**: Gemini 2.0 Flash Experimental
- **Database**: PostgreSQL (MSE trading data)

## Data Flow
1. Receives market analysis requests via Kafka
2. Fetches latest MSE trading data from PostgreSQL
3. Calculates market statistics (gainers, losers, average change)
4. Identifies top and bottom performers
5. Generates AI insights using Gemini
6. Publishes comprehensive market report to `user-responses` topic

## Request Format
```json
{
  "requestId": "unique-id",
  "userId": "user-id",
  "intent": "market_analysis",
  "message": "Show me current market trends",
  "timestamp": "2025-11-08T00:00:00.000Z"
}
```

## Response Format
```json
{
  "requestId": "unique-id",
  "userId": "user-id",
  "agent": "market-analysis",
  "status": "success",
  "data": {
    "summary": "AI-generated market insights...",
    "marketOverview": {
      "totalCompanies": 50,
      "gainers": 25,
      "losers": 20,
      "averageChange": 1.2
    },
    "topPerformers": [...],
    "bottomPerformers": [...],
    "insights": ["Key insight 1", "Key insight 2"]
  },
  "message": "Market analysis completed successfully",
  "timestamp": "2025-11-08T00:00:05.000Z"
}
```

## Running the Agent

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Environment Variables
Required in `.env` (parent directory):
- `KAFKA_BROKER` - Kafka broker address (default: localhost:9092)
- `DATABASE_URL` - PostgreSQL connection string
- `GEMINI_API_KEY` - Google Gemini API key

## Performance
- Average processing time: 8-10 seconds
- Database query time: < 100ms
- AI analysis time: 8-9 seconds
- Throughput: ~6-8 requests/minute (limited by Gemini API)

## Thesis Integration
Demonstrates:
- Event-driven architecture with Apache Kafka
- AI-powered financial analysis with LLMs
- Real-time market data processing
- Microservice pattern for specialized agents

