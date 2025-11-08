# Risk Assessment Agent

## Overview
Provides comprehensive portfolio risk analysis using Value at Risk (VaR), Monte Carlo simulation, and AI-powered risk insights with Gemini 2.0 Flash.

## Features
- **Value at Risk (VaR)** calculation at multiple time horizons
- **Monte Carlo simulation** (1000+ scenarios)
- **Portfolio metrics** (volatility, Sharpe ratio, max drawdown)
- **Diversification scoring**
- **AI-powered risk recommendations**
- **Risk level classification** (low/medium/high/very-high)

## Architecture
- **Input Topic**: `risk-assessment-events`
- **Output Topic**: `user-responses`
- **Consumer Group**: `risk-assessment-group`
- **LLM**: Gemini 2.0 Flash Experimental
- **Database**: PostgreSQL (MSE data + portfolio holdings)

## Risk Calculation Methods

### Value at Risk (VaR)
Statistical measure of potential loss:
- **1-Day VaR**: Maximum expected loss in one trading day
- **1-Week VaR**: Maximum expected loss in one week
- **1-Month VaR**: Maximum expected loss in one month
- **Confidence Level**: Typically 95% or 99%

Formula: `VaR = Portfolio Value × Volatility × Z-Score`

### Monte Carlo Simulation
Runs 1000+ simulations of portfolio performance:
- **Expected Return**: Average outcome across all simulations
- **Best Case**: Top 5th percentile scenario
- **Worst Case**: Bottom 5th percentile scenario
- **Probability of Loss**: Percentage of scenarios with negative returns

### Portfolio Metrics

#### Volatility
Annualized standard deviation of returns:
- < 10%: Low volatility
- 10-20%: Moderate volatility
- 20-30%: High volatility
- > 30%: Very high volatility

#### Diversification Score
Measures portfolio concentration (0-100):
- 0-30: Poor diversification
- 30-60: Moderate diversification
- 60-100: Well diversified

Formula: Based on Herfindahl-Hirschman Index (HHI)

#### Max Drawdown
Largest peak-to-trough decline in portfolio value.

## Request Format
```json
{
  "requestId": "unique-id",
  "userId": "user-id",
  "intent": "risk_assessment",
  "message": "Assess my portfolio risk",
  "metadata": {
    "portfolio": [
      {
        "symbol": "APU-O-0000",
        "shares": 100,
        "avgPrice": 1000
      },
      {
        "symbol": "TDB-O-0000",
        "shares": 50,
        "avgPrice": 2000
      }
    ],
    "confidenceLevel": 0.95,
    "timeHorizon": 252
  },
  "timestamp": "2025-11-08T00:00:00.000Z"
}
```

## Response Format
```json
{
  "requestId": "unique-id",
  "userId": "user-id",
  "agent": "risk-assessment",
  "status": "success",
  "data": {
    "summary": "Portfolio shows medium risk with 18.5% volatility...",
    "valueAtRisk": {
      "oneDay": 2500,
      "oneWeek": 5590,
      "oneMonth": 11180,
      "confidenceLevel": 0.95,
      "interpretation": "With 95% confidence, maximum loss in one day is 2500 MNT"
    },
    "monteCarloSimulation": {
      "simulations": 1000,
      "expectedReturn": 12.5,
      "worstCase": -25.3,
      "bestCase": 48.7,
      "probabilityOfLoss": 38.5
    },
    "portfolioMetrics": {
      "totalValue": 200000,
      "volatility": 18.5,
      "sharpeRatio": 0.85,
      "beta": 1.1,
      "maxDrawdown": -15.2,
      "diversificationScore": 65
    },
    "riskLevel": "medium",
    "recommendations": [
      "Current risk level is manageable for moderate investors",
      "Diversification is adequate with score of 65/100",
      "Set stop-loss orders at 22% to limit downside risk",
      "Expected return is positive - maintain with monitoring"
    ],
    "insights": [
      "Portfolio volatility: 18.5% (annualized)",
      "1-day VaR: 2500 MNT at 95% confidence",
      "Probability of loss: 38.5% (based on 1000 simulations)",
      "Diversification score: 65/100 - good"
    ]
  },
  "message": "Risk assessment completed successfully",
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
- Database queries: 2-3 queries per assessment
- VaR calculation: < 10ms
- Monte Carlo simulation: 50-100ms (1000 runs)
- AI analysis time: 4-5 seconds
- Throughput: ~10-15 requests/minute

## Implementation Details

### VaR Calculation Method
**Historical Simulation Approach**:
1. Calculate individual asset volatilities from historical returns
2. Calculate portfolio volatility using weights
3. Apply confidence level Z-score (1.65 for 95%, 2.33 for 99%)
4. Scale by time horizon using square root of time rule

### Monte Carlo Simulation
**Geometric Brownian Motion**:
1. Initialize portfolio value
2. For each simulation:
   - Generate random daily returns (normal distribution)
   - Apply returns over time horizon
   - Record final portfolio value
3. Calculate statistics across all simulations

### Risk Level Classification
- **Low**: Volatility < 10%, Probability of Loss < 30%
- **Medium**: Volatility 10-20%, Probability of Loss 30-45%
- **High**: Volatility 20-30%, Probability of Loss 45-60%
- **Very High**: Volatility > 30%, Probability of Loss > 60%

### Diversification Calculation
Uses Herfindahl-Hirschman Index (HHI):
```
HHI = Σ(weight²)
Diversification Score = 100 × (1 - HHI) × (# holdings / 10)
```

## AI Integration
Gemini analyzes:
- VaR levels vs. portfolio size
- Monte Carlo outcomes distribution
- Volatility in market context
- Diversification adequacy
- Risk-adjusted returns
- Correlation risks

Provides:
- Plain-language risk summary
- Actionable recommendations
- Context-aware insights
- Portfolio optimization suggestions

## Thesis Integration
Demonstrates:
- Advanced quantitative finance
- Statistical risk modeling
- Monte Carlo methods
- Portfolio theory implementation
- AI-powered financial advisory
- Real-time risk monitoring
- Integration of traditional quant finance and AI

## Testing
```bash
# Send test request with default portfolio
echo '{"requestId":"test-001","userId":"user123","intent":"risk_assessment","message":"Assess portfolio risk","timestamp":"2025-11-08T00:00:00.000Z"}' | \
docker exec -i thesis-kafka kafka-console-producer --bootstrap-server localhost:9092 --topic risk-assessment-events

# Send test request with custom portfolio
echo '{"requestId":"test-002","userId":"user123","intent":"risk_assessment","message":"Check risk","metadata":{"portfolio":[{"symbol":"APU-O-0000","shares":100,"avgPrice":1000}],"confidenceLevel":0.99},"timestamp":"2025-11-08T00:00:00.000Z"}' | \
docker exec -i thesis-kafka kafka-console-producer --bootstrap-server localhost:9092 --topic risk-assessment-events
```

## Use Cases
1. **Pre-Investment Risk Check**: Assess risk before adding new positions
2. **Portfolio Rebalancing**: Identify when risk exceeds tolerance
3. **Stress Testing**: Understand worst-case scenarios
4. **Risk Reporting**: Generate periodic risk reports
5. **Regulatory Compliance**: Calculate required risk metrics

## Future Enhancements
- Conditional VaR (CVaR / Expected Shortfall)
- Correlation matrix analysis
- Sector concentration risk
- Historical stress testing
- Real-time risk alerts
- Custom risk tolerance profiles
- Multi-portfolio comparison
- Risk attribution analysis

