#!/usr/bin/env python3
"""
Simplified Flink Planner Agent (Thesis Demo)

Consumes: planning.tasks topic
Produces: execution.plans, agent.tasks topics

Responsibilities:
- Receive complex workflow requests from Orchestrator
- Use Gemini LLM to generate multi-step execution plans
- Determine agent sequence and parameters
- Publish execution plans back to Kafka
"""

import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, Any, List
import uuid

# Kafka client
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError

# Load environment variables
from dotenv import load_dotenv
load_dotenv(dotenv_path='../.env')

# Gemini client
import google.generativeai as genai

# Configure Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not found in environment")
    sys.exit(1)

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash')

# Kafka configuration
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:9092')

def log(message: str, data: Dict = None):
    """Simple logging"""
    timestamp = datetime.now().isoformat()
    if data:
        print(f"[{timestamp}] {message}: {json.dumps(data)}")
    else:
        print(f"[{timestamp}] {message}")

def generate_execution_plan(task: Dict[str, Any]) -> Dict[str, Any]:
    """
    Use Gemini AI to generate a multi-step execution plan
    """
    query = task.get('query', '')
    intent = task.get('intent', '')
    parameters = task.get('parameters', {})
    
    # Construct prompt for Gemini
    prompt = f"""You are a planning agent for a financial AI system. Generate a structured execution plan.

User Query: {query}
Detected Intent: {intent}
Parameters: {json.dumps(parameters)}

Available Agents:
1. knowledge - RAG agent for retrieving information about MSE companies
2. investment - Portfolio analysis, market trends, recommendations
3. news - Financial news and sentiment analysis

Generate a JSON execution plan with this structure:
{{
  "steps": [
    {{
      "order": 1,
      "agent": "agent_name",
      "action": "specific_action",
      "params": {{}},
      "depends_on": []
    }}
  ],
  "reasoning": "Brief explanation of the plan"
}}

Rules:
- If query asks about specific companies, use knowledge agent first
- For investment advice, use investment agent
- For news, use news agent
- Steps can run in parallel if no dependencies
- Keep it simple (max 3 steps)

Respond with ONLY the JSON, no other text."""

    try:
        response = model.generate_content(prompt)
        plan_text = response.text.strip()
        
        # Try to extract JSON from response
        if '```json' in plan_text:
            plan_text = plan_text.split('```json')[1].split('```')[0].strip()
        elif '```' in plan_text:
            plan_text = plan_text.split('```')[1].split('```')[0].strip()
        
        plan = json.loads(plan_text)
        return plan
        
    except Exception as e:
        log(f"Error generating plan with Gemini: {e}")
        # Fallback plan
        return {
            "steps": [
                {
                    "order": 1,
                    "agent": "investment",
                    "action": "analyze_portfolio",
                    "params": parameters,
                    "depends_on": []
                }
            ],
            "reasoning": "Default fallback plan due to error"
        }

def process_planning_task(task_data: Dict[str, Any], producer: KafkaProducer):
    """
    Process a planning task and generate execution plan
    """
    task_id = task_data.get('taskId')
    correlation_id = task_data.get('correlationId')
    user_id = task_data.get('userId')
    
    log(f"📋 Processing planning task", {"taskId": task_id})
    
    start_time = time.time()
    
    # Generate execution plan using Gemini
    plan = generate_execution_plan(task_data)
    
    processing_time = int((time.time() - start_time) * 1000)
    
    # Create execution plan message
    execution_plan = {
        "planId": str(uuid.uuid4()),
        "correlationId": correlation_id,
        "userId": user_id,
        "sequence": plan.get('steps', []),
        "reasoning": plan.get('reasoning', ''),
        "status": "generated",
        "metadata": {
            "processingTimeMs": processing_time,
            "model": "gemini-2.0-flash",
            "steps": len(plan.get('steps', []))
        },
        "timestamp": datetime.now().isoformat()
    }
    
    # Publish execution plan
    producer.send(
        'execution.plans',
        key=task_id.encode('utf-8'),
        value=json.dumps(execution_plan).encode('utf-8')
    )
    
    log(f"✅ Published execution plan", {
        "planId": execution_plan['planId'],
        "steps": len(plan.get('steps', [])),
        "processingTimeMs": processing_time
    })
    
    # Send individual agent tasks for each step
    for step in plan.get('steps', []):
        agent_task = {
            "taskId": str(uuid.uuid4()),
            "correlationId": correlation_id,
            "requestId": correlation_id,
            "userId": user_id,
            "agentType": step.get('agent'),
            "action": step.get('action'),
            "payload": step.get('params', {}),
            "planStep": step.get('order'),
            "timestamp": datetime.now().isoformat()
        }
        
        producer.send(
            'agent.tasks',
            key=agent_task['taskId'].encode('utf-8'),
            value=json.dumps(agent_task).encode('utf-8')
        )
        
        log(f"📤 Sent task to {step.get('agent')} agent", {"taskId": agent_task['taskId']})
    
    # Send monitoring event
    monitoring_event = {
        "eventId": f"mon_{int(time.time() * 1000)}",
        "service": "flink-planner",
        "eventType": "metric",
        "message": "Planning task processed",
        "metadata": {
            "taskId": task_id,
            "steps": len(plan.get('steps', [])),
            "processingTimeMs": processing_time
        },
        "timestamp": datetime.now().isoformat()
    }
    
    producer.send(
        'monitoring.events',
        key='flink-planner'.encode('utf-8'),
        value=json.dumps(monitoring_event).encode('utf-8')
    )

def main():
    """
    Main function - Start Flink Planner Agent
    """
    print("==========================================")
    print("🚀 Starting Flink Planner Agent (PyFlink-style)")
    print("==========================================")
    print()
    
    # Create Kafka consumer
    consumer = KafkaConsumer(
        'planning.tasks',
        bootstrap_servers=KAFKA_BROKER,
        group_id='flink-planner-group',
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset='latest',
        enable_auto_commit=True
    )
    
    # Create Kafka producer
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BROKER,
        value_serializer=lambda v: v if isinstance(v, bytes) else v.encode('utf-8')
    )
    
    log("✅ Connected to Kafka")
    log(f"📥 Listening on: planning.tasks")
    log(f"📤 Publishing to: execution.plans, agent.tasks")
    print("==========================================")
    print()
    
    # Start consuming messages
    try:
        for message in consumer:
            task_data = message.value
            process_planning_task(task_data, producer)
            producer.flush()
            
    except KeyboardInterrupt:
        log("🛑 Shutting down Flink Planner...")
    except Exception as e:
        log(f"❌ Error: {e}")
    finally:
        consumer.close()
        producer.close()
        log("👋 Flink Planner stopped")

if __name__ == "__main__":
    main()
