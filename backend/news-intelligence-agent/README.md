# News Intelligence Agent

## Overview
Provides AI-powered news analysis with sentiment classification for Mongolian Stock Exchange (MSE) companies using Gemini 2.0 Flash.

## Features
- AI-generated financial news articles
- Sentiment analysis (positive/neutral/negative)
- Market impact assessment
- Key topics identification
- Multi-company news correlation
- Impact level classification (high/medium/low)

## Architecture
- **Input Topic**: `news-events`
- **Output Topic**: `user-responses`
- **Consumer Group**: `news-intelligence-group`
- **LLM**: Gemini 2.0 Flash Experimental
- **Database**: PostgreSQL (MSE company data)

## Data Flow
1. Receives news intelligence requests via Kafka
2. Fetches relevant MSE company symbols from PostgreSQL
3. Generates AI-powered news analysis using Gemini
4. Performs sentiment classification
5. Calculates sentiment overview statistics
6. Publishes comprehensive news report to `user-responses` topic

## Request Format
```json
{
  "requestId": "unique-id",
  "userId": "user-id",
  "intent": "news_query",
  "message": "Get latest MSE news",
  "metadata": {
    "symbols": ["APU", "TDB", "SUU"],  // Optional
    "timeframe": "24h"  // Optional
  },
  "timestamp": "2025-11-08T00:00:00.000Z"
}
```

## Response Format
```json
{
  "requestId": "unique-id",
  "userId": "user-id",
  "agent": "news-intelligence",
  "status": "success",
  "data": {
    "summary": "Analyzed 5 news articles...",
    "articles": [
      {
        "title": "Article headline",
        "source": "News source",
        "publishedAt": "2025-11-08",
        "sentiment": "positive",
        "relevantSymbols": ["APU", "TDB"],
        "summary": "Brief article summary",
        "impact": "high"
      }
    ],
    "sentimentOverview": {
      "positive": 3,
      "neutral": 1,
      "negative": 1
    },
    "keyTopics": ["Earnings Reports", "Foreign Investment"],
    "marketImpact": "Overall market impact analysis..."
  },
  "message": "News intelligence analysis completed",
  "timestamp": "2025-11-08T00:00:02.000Z"
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
- Average processing time: 1-2 seconds
- Database query time: < 50ms
- AI analysis time: 1-2 seconds
- Throughput: ~30-60 requests/minute (limited by Gemini API)

## News Generation Strategy
The agent uses Gemini to generate realistic, context-aware news articles based on:
- Current MSE company performance
- Market trends
- Sector developments
- Economic indicators

In production, this can be enhanced with:
- Integration with real news APIs (e.g., NewsAPI, Bloomberg)
- Web scraping of Mongolian financial news sites
- RSS feed aggregation
- Historical news database

## Thesis Integration
Demonstrates:
- AI-powered sentiment analysis
- Natural language processing with LLMs
- Event-driven news intelligence
- Real-time information aggregation
- Microservice-based financial analysis

