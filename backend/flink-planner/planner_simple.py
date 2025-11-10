#!/usr/bin/env python3
"""
Simplified Flink Planner Agent - Lightweight for Thesis Demo
Working version without heavy dependencies hanging
"""

print("Starting imports...", flush=True)

import json
import os
import sys
import time
from datetime import datetime
import uuid

print("Imported standard libraries", flush=True)

# Kafka client - lightweight
from kafka import KafkaConsumer, KafkaProducer

print("Imported Kafka", flush=True)

# Dotenv
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path='../.env')
    print("Loaded .env", flush=True)
except Exception as e:
    print(f"Warning loading .env: {e}", flush=True)

print("==========================================")
print("🚀 Starting Flink Planner Agent")
print("==========================================")
print()

# Configuration
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:9092')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

print(f"Kafka Broker: {KAFKA_BROKER}")
print(f"Gemini API Key: {'***' if GEMINI_API_KEY else 'NOT SET'}")
print()

# Simple planning logic without Gemini for now
def generate_simple_plan(task):
    """Generate a basic execution plan without LLM"""
    query = task.get('query', '').lower()
    intent = task.get('intent', '')
    
    # Rule-based planning
    steps = []
    
    if 'invest' in query or 'portfolio' in query:
        steps.append({
            "order": 1,
            "agent": "investment",
            "action": "analyze_portfolio",
            "params": task.get('parameters', {}),
            "depends_on": []
        })
    
    if 'news' in query:
        steps.append({
            "order": len(steps) + 1,
            "agent": "news",
            "action": "fetch_news",
            "params": {},
            "depends_on": []
        })
    
    # Default if no specific match
    if not steps:
        steps.append({
            "order": 1,
            "agent": "investment",
            "action": "provide_advice",
            "params": task.get('parameters', {}),
            "depends_on": []
        })
    
    return {
        "steps": steps,
        "reasoning": f"Simple rule-based plan for query: {query[:50]}..."
    }

def main():
    print("Creating Kafka consumer...")
    consumer = KafkaConsumer(
        'planning.tasks',
        bootstrap_servers=KAFKA_BROKER,
        group_id='flink-planner-group',
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset='latest',
        enable_auto_commit=True,
        consumer_timeout_ms=1000
    )
    
    print("Creating Kafka producer...")
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BROKER,
        value_serializer=lambda v: v.encode('utf-8') if isinstance(v, str) else v
    )
    
    print("✅ Connected to Kafka")
    print("📥 Listening on: planning.tasks")
    print("📤 Publishing to: execution.plans, agent.tasks")
    print("==========================================")
    print()
    
    try:
        while True:
            try:
                # Poll for messages
                message_batch = consumer.poll(timeout_ms=1000)
                
                for topic_partition, messages in message_batch.items():
                    for message in messages:
                        task_data = message.value
                        task_id = task_data.get('taskId', 'unknown')
                        
                        print(f"📋 Received planning task: {task_id}")
                        
                        # Generate plan
                        plan = generate_simple_plan(task_data)
                        
                        # Create execution plan
                        execution_plan = {
                            "planId": str(uuid.uuid4()),
                            "correlationId": task_data.get('correlationId'),
                            "userId": task_data.get('userId'),
                            "sequence": plan['steps'],
                            "reasoning": plan['reasoning'],
                            "status": "generated",
                            "timestamp": datetime.now().isoformat()
                        }
                        
                        # Publish execution plan
                        producer.send(
                            'execution.plans',
                            key=task_id.encode('utf-8'),
                            value=json.dumps(execution_plan).encode('utf-8')
                        )
                        
                        print(f"✅ Published execution plan: {execution_plan['planId']}")
                        
                        # Send agent tasks
                        for step in plan['steps']:
                            agent_task = {
                                "taskId": str(uuid.uuid4()),
                                "correlationId": task_data.get('correlationId'),
                                "requestId": task_data.get('correlationId'),
                                "userId": task_data.get('userId'),
                                "agentType": step['agent'],
                                "action": step['action'],
                                "payload": step.get('params', {}),
                                "timestamp": datetime.now().isoformat()
                            }
                            
                            producer.send(
                                'agent.tasks',
                                key=agent_task['taskId'].encode('utf-8'),
                                value=json.dumps(agent_task).encode('utf-8')
                            )
                            
                            print(f"📤 Sent task to {step['agent']} agent")
                        
                        producer.flush()
                
                time.sleep(0.1)  # Small delay
                
            except Exception as e:
                print(f"Error processing message: {e}")
                time.sleep(1)
                
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
    finally:
        consumer.close()
        producer.close()
        print("👋 Flink Planner stopped")

if __name__ == "__main__":
    main()

