# Historical Analysis Agent

## Overview
Provides technical analysis of MSE stock price history using advanced technical indicators and AI-powered pattern recognition with Gemini 2.0 Flash.

## Features
- **Technical Indicators**:
  - Simple Moving Average (SMA 20, 50, 200)
  - Relative Strength Index (RSI)
  - MACD (Moving Average Convergence Divergence)
  - Bollinger Bands
  
- **AI-Powered Analysis**:
  - Chart pattern detection
  - Trend identification
  - Trading signal generation
  - Buy/Hold/Sell recommendations

## Architecture
- **Input Topic**: `market-analysis-events` (shared with Market Analysis)
- **Output Topic**: `user-responses`
- **Consumer Group**: `historical-analysis-group`
- **LLM**: Gemini 2.0 Flash Experimental
- **Database**: PostgreSQL (MSE historical data)

## Technical Indicator Calculations

### Simple Moving Average (SMA)
Calculates average closing price over specified period (20, 50, or 200 days).

### Relative Strength Index (RSI)
Momentum oscillator measuring speed and magnitude of price changes (0-100 scale).
- RSI < 30: Oversold (potential buy signal)
- RSI > 70: Overbought (potential sell signal)

### MACD
Trend-following momentum indicator showing relationship between two EMAs.
- MACD Line: 12-day EMA - 26-day EMA
- Signal Line: 9-day EMA of MACD
- Histogram: MACD - Signal

### Bollinger Bands
Volatility indicator with upper and lower bands at ±2 standard deviations from SMA.

## Request Format
```json
{
  "requestId": "unique-id",
  "userId": "user-id",
  "intent": "historical_analysis",
  "message": "Analyze historical data for APU-O-0000",
  "metadata": {
    "symbol": "APU-O-0000",
    "period": 90,
    "indicators": ["sma", "rsi", "macd", "bollinger"]
  },
  "timestamp": "2025-11-08T00:00:00.000Z"
}
```

## Response Format
```json
{
  "requestId": "unique-id",
  "userId": "user-id",
  "agent": "historical-analysis",
  "status": "success",
  "data": {
    "symbol": "APU-O-0000",
    "summary": "AI-generated technical analysis...",
    "technicalIndicators": {
      "sma20": 1250.50,
      "sma50": 1220.30,
      "sma200": 1180.75,
      "rsi": 65.4,
      "macd": {
        "macd": 12.5,
        "signal": 10.2,
        "histogram": 2.3
      },
      "bollingerBands": {
        "upper": 1320.50,
        "middle": 1250.00,
        "lower": 1179.50
      }
    },
    "priceHistory": [
      {
        "date": "2024-11-08",
        "open": 1245.00,
        "high": 1260.00,
        "low": 1240.00,
        "close": 1255.00,
        "volume": 15000
      }
    ],
    "patterns": [
      {
        "pattern": "Bullish Crossover",
        "confidence": "high",
        "description": "Price crossed above 50-day SMA"
      }
    ],
    "recommendation": "BUY: Strong bullish signals with RSI in healthy range",
    "insights": [
      "Price above all major SMAs indicating strong uptrend",
      "RSI at 65.4 shows momentum without overbought condition",
      "MACD histogram positive and expanding"
    ]
  },
  "message": "Historical analysis completed for APU-O-0000",
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
- Average processing time: 4-6 seconds
- Database query time: < 200ms
- Technical indicator calculation: < 50ms
- AI analysis time: 4-5 seconds
- Throughput: ~10-15 requests/minute

## Implementation Details

### Technical Indicator Accuracy
- SMA: Exact calculation over specified period
- RSI: 14-period standard implementation
- MACD: 12/26/9 EMA configuration
- Bollinger Bands: 20-period, 2 standard deviations

### AI Integration
Gemini analyzes:
- Price action relative to moving averages
- RSI overbought/oversold conditions
- MACD crossovers and divergences
- Bollinger Band squeezes and breakouts
- Volume patterns

### Chart Pattern Detection
AI-powered recognition of:
- Trend patterns (uptrend, downtrend, consolidation)
- Reversal patterns (head and shoulders, double top/bottom)
- Continuation patterns (flags, pennants)
- Candlestick patterns

## Thesis Integration
Demonstrates:
- Advanced financial analytics
- Technical indicator implementation
- Time-series data processing
- AI-powered pattern recognition
- Real-time signal generation
- Integration of traditional finance and modern AI

## Testing
```bash
# Send test request
echo '{"requestId":"test-001","userId":"user123","intent":"historical_analysis","message":"Analyze APU-O-0000","metadata":{"symbol":"APU-O-0000","period":90},"timestamp":"2025-11-08T00:00:00.000Z"}' | \
docker exec -i thesis-kafka kafka-console-producer --bootstrap-server localhost:9092 --topic market-analysis-events

# Check response
docker exec thesis-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic user-responses --from-beginning --max-messages 1
```

## Future Enhancements
- More technical indicators (Stochastic, ADX, OBV)
- Machine learning price prediction
- Backtesting framework
- Real-time chart generation
- Advanced pattern recognition
- Multi-timeframe analysis

