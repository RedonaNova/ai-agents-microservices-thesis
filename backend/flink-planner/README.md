# PyFlink Planner Agent

Event-Driven execution planner using PyFlink and Google Gemini.

## Overview

The Flink Planner Agent handles complex multi-agent workflows by:
- Consuming from `planning.tasks` topic
- Using Gemini LLM to generate execution plans
- Publishing to `execution.plans` topic
- Providing stateful stream processing for aggregation

## Architecture

```
planning.tasks → PyFlink Planner → Gemini LLM → execution.plans
```

## Setup

### 1. Install Python Dependencies

```bash
cd backend/flink-planner
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Ensure `backend/.env` has:
```env
GEMINI_API_KEY=your_key_here
KAFKA_BROKER=localhost:9092
```

### 3. Run the Planner

```bash
python3 planner_job.py
```

## How It Works

1. **Consume**: Listens to `planning.tasks` for complex queries
2. **Analyze**: Uses Gemini to understand required agent sequence
3. **Plan**: Generates step-by-step execution plan with dependencies
4. **Publish**: Sends plan to `execution.plans` for agents to consume

## Example Flow

**Input** (`planning.tasks`):
```json
{
  "taskId": "task_001",
  "correlationId": "corr_abc",
  "requestId": "req_123",
  "userId": "user_456",
  "complexity": "multi-agent",
  "query": "Analyze my portfolio risk and suggest rebalancing",
  "requiredAgents": ["knowledge-agent", "investment-agent"]
}
```

**Output** (`execution.plans`):
```json
{
  "planId": "plan_task_001",
  "taskId": "task_001",
  "correlationId": "corr_abc",
  "sequence": ["knowledge-agent", "investment-agent"],
  "steps": [
    {
      "stepId": 1,
      "agent": "knowledge-agent",
      "action": "retrieve_context",
      "params": {"query": "portfolio risk factors"},
      "dependsOn": []
    },
    {
      "stepId": 2,
      "agent": "investment-agent",
      "action": "analyze_portfolio",
      "params": {"userId": "user_456"},
      "dependsOn": [1]
    }
  ]
}
```

## Key Features

### 1. LLM-Powered Planning
Uses Gemini to intelligently determine:
- Which agents are needed
- Optimal execution sequence
- Required parameters for each step
- Dependencies between steps

### 2. Fallback Logic
If Gemini fails, provides simple sequential plan

### 3. Stream Processing
Built on Apache Flink for:
- Scalability
- Fault tolerance
- Exactly-once semantics

## Deployment

### Standalone (Dev)
```bash
python3 planner_job.py
```

### With Flink Cluster (Production)
```bash
flink run -py planner_job.py
```

## Monitoring

Logs show:
- Tasks received
- Plans generated
- Errors (with fallback)

## Thesis Contribution

Demonstrates:
- Stream processing for workflow orchestration
- LLM integration in Flink jobs
- Dynamic execution planning
- Exactly-once message processing

## Troubleshooting

**Error: "GEMINI_API_KEY not found"**
- Ensure `.env` file exists in `backend/` directory
- Check API key is valid

**Error: "Kafka connection failed"**
- Ensure Kafka is running: `docker-compose ps`
- Check `KAFKA_BROKER` environment variable

**Plans not generating**
- Check Gemini API quota
- Review logs for errors
- Verify `planning.tasks` topic exists

