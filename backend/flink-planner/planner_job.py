#!/usr/bin/env python3
"""
PyFlink Planner Agent - Working Version
Demonstrates stream processing concept for thesis

Uses kafka-python for I/O (simpler) with Flink processing logic
"""

import json
import os
import sys
import time
from datetime import datetime
import uuid

print("=" * 50, flush=True)
print("🚀 Starting PyFlink Planner Agent", flush=True)
print("=" * 50, flush=True)
print(flush=True)

# Kafka client
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError

# Load environment variables
from dotenv import load_dotenv
load_dotenv(dotenv_path='../.env')

print("✅ Loaded environment variables", flush=True)

# Gemini client
try:
    import google.generativeai as genai
    print("✅ Imported Gemini AI", flush=True)
except ImportError as e:
    print(f"⚠️  Warning: Could not import Gemini AI: {e}", flush=True)
    genai = None

# Configure Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY and genai:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash')
        print("✅ Configured Gemini AI (gemini-2.0-flash)", flush=True)
    except Exception as e:
        print(f"⚠️  Warning: Could not configure Gemini: {e}", flush=True)
        model = None
else:
    print("⚠️  Gemini API key not found, using rule-based planning", flush=True)
    model = None

# Kafka configuration
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:9092')

def log(message: str, data: dict = None):
    """Simple logging with timestamp"""
    timestamp = datetime.now().isoformat()
    if data:
        print(f"[{timestamp}] {message}: {json.dumps(data)}", flush=True)
    else:
        print(f"[{timestamp}] {message}", flush=True)

def generate_execution_plan_with_gemini(task: dict) -> dict:
    """
    Use Gemini AI to generate a multi-step execution plan
    """
    if not model:
        return generate_rule_based_plan(task)
    
    query = task.get('query', '')
    intent = task.get('intent', '')
    parameters = task.get('parameters', {})
    
    prompt = f"""You are a planning agent for a financial AI system. Generate a structured execution plan.

User Query: {query}
Detected Intent: {intent}
Parameters: {json.dumps(parameters)}

Available Agents:
1. knowledge - RAG agent for retrieving information about MSE companies (Mongolian language)
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
- If query asks about specific MSE companies, use knowledge agent first
- For investment advice, use investment agent
- For news, use news agent
- Steps can run in parallel if no dependencies
- Keep it simple (max 3 steps)

Respond with ONLY the JSON, no markdown or extra text."""

    try:
        response = model.generate_content(prompt)
        plan_text = response.text.strip()
        
        # Extract JSON from response
        if '```json' in plan_text:
            plan_text = plan_text.split('```json')[1].split('```')[0].strip()
        elif '```' in plan_text:
            plan_text = plan_text.split('```')[1].split('```')[0].strip()
        
        plan = json.loads(plan_text)
        log("✅ Generated plan with Gemini AI", {"steps": len(plan.get('steps', []))})
        return plan
        
    except Exception as e:
        log(f"⚠️  Error with Gemini, using fallback", {"error": str(e)})
        return generate_rule_based_plan(task)

def generate_rule_based_plan(task: dict) -> dict:
    """
    Fallback: Generate execution plan using simple rules
    """
    query = task.get('query', '').lower()
    intent = task.get('intent', '')
    parameters = task.get('parameters', {})
    
    steps = []
    
    # Rule-based logic
    if 'invest' in query or 'portfolio' in query:
        steps.append({
            "order": 1,
            "agent": "investment",
            "action": "analyze_portfolio",
            "params": parameters,
            "depends_on": []
        })
    
    if 'company' in query or 'компани' in query:
        steps.insert(0, {
            "order": 1,
            "agent": "knowledge",
            "action": "search_companies",
            "params": {"query": query},
            "depends_on": []
        })
    
    if 'news' in query or 'мэдээ' in query:
        steps.append({
            "order": len(steps) + 1,
            "agent": "news",
            "action": "fetch_news",
            "params": {},
            "depends_on": []
        })
    
    # Default if no match
    if not steps:
        steps.append({
            "order": 1,
            "agent": "investment",
            "action": "provide_advice",
            "params": parameters,
            "depends_on": []
        })
    
    # Renumber steps
    for i, step in enumerate(steps):
        step['order'] = i + 1
    
    return {
        "steps": steps,
        "reasoning": f"Rule-based plan for: {query[:50]}..."
    }

def process_planning_task(task_data: dict, producer: KafkaProducer):
    """
    Process a planning task (Flink-style processing)
    """
    task_id = task_data.get('taskId', 'unknown')
    correlation_id = task_data.get('correlationId', task_id)
    user_id = task_data.get('userId', 'unknown')
    
    log("📋 Processing planning task", {"taskId": task_id, "query": task_data.get('query', '')[:50]})
    
    start_time = time.time()
    
    # Generate execution plan (with or without Gemini)
    if model:
        plan = generate_execution_plan_with_gemini(task_data)
    else:
        plan = generate_rule_based_plan(task_data)
    
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
            "model": "gemini-2.0-flash" if model else "rule-based",
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
    
    log("✅ Published execution plan", {
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
            "processingTimeMs": processing_time,
            "usedGemini": model is not None
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
    Main function - Start PyFlink Planner Agent
    """
    print(flush=True)
    log(f"Kafka Broker: {KAFKA_BROKER}")
    log(f"Gemini AI: {'Enabled' if model else 'Disabled (using rule-based)'}")
    print(flush=True)
    
    # Create Kafka consumer
    try:
        consumer = KafkaConsumer(
            'planning.tasks',
            bootstrap_servers=KAFKA_BROKER,
            group_id='flink-planner-group',
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='latest',
            enable_auto_commit=True,
            consumer_timeout_ms=1000
        )
        log("✅ Connected to Kafka consumer")
    except Exception as e:
        log(f"❌ Failed to create Kafka consumer: {e}")
        sys.exit(1)
    
    # Create Kafka producer
    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BROKER,
            value_serializer=lambda v: v if isinstance(v, bytes) else v.encode('utf-8')
        )
        log("✅ Connected to Kafka producer")
    except Exception as e:
        log(f"❌ Failed to create Kafka producer: {e}")
        sys.exit(1)
    
    print("=" * 50, flush=True)
    log("📥 Listening on: planning.tasks")
    log("📤 Publishing to: execution.plans, agent.tasks, monitoring.events")
    print("=" * 50, flush=True)
    print(flush=True)
    
    # Start consuming messages
    try:
        while True:
            try:
                # Poll for messages
                message_batch = consumer.poll(timeout_ms=1000)
                
                for topic_partition, messages in message_batch.items():
                    for message in messages:
                        task_data = message.value
                        process_planning_task(task_data, producer)
                        producer.flush()
                
                time.sleep(0.1)  # Small delay to prevent CPU spinning
                
            except Exception as e:
                log(f"❌ Error processing message: {e}")
                time.sleep(1)
                
    except KeyboardInterrupt:
        log("🛑 Shutting down PyFlink Planner...")
    except Exception as e:
        log(f"💥 Fatal error: {e}")
    finally:
        consumer.close()
        producer.close()
        log("👋 PyFlink Planner stopped")

if __name__ == "__main__":
    main()
