#!/usr/bin/env python3
"""
PyFlink Planner Agent

Consumes: planning.tasks topic
Produces: execution.plans topic

Responsibilities:
- Receive complex workflow requests
- Use Gemini LLM to generate execution plans
- Determine agent sequence and parameters
- Handle stateful aggregation (collect multi-agent results)
- Publish detailed execution plans
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, Any, List

# PyFlink imports
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.connectors.kafka import (
    KafkaSource,
    KafkaSink,
    KafkaRecordSerializationSchema,
    KafkaOffsetsInitializer
)
from pyflink.common import Types, WatermarkStrategy, SimpleStringSchema
from pyflink.common.serialization import SimpleStringEncoder

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

print("=" * 60)
print("🚀 PyFlink Planner Agent Starting")
print("=" * 60)
print(f"Kafka Broker: {KAFKA_BROKER}")
print(f"Input Topic: planning.tasks")
print(f"Output Topic: execution.plans")
print("=" * 60)

def generate_execution_plan(task_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Use Gemini LLM to generate execution plan
    """
    try:
        task_id = task_data.get('taskId', 'unknown')
        query = task_data.get('query', '')
        required_agents = task_data.get('requiredAgents', [])
        
        print(f"📋 Generating plan for task: {task_id}")
        print(f"   Query: {query}")
        print(f"   Required Agents: {required_agents}")
        
        # Build prompt for Gemini
        prompt = f"""You are an execution planner for a multi-agent system.

Given a user query and required agents, generate a step-by-step execution plan.

User Query: {query}
Required Agents: {', '.join(required_agents)}

Generate a JSON execution plan with this structure:
{{
  "sequence": ["agent1", "agent2"],
  "steps": [
    {{
      "stepId": 1,
      "agent": "knowledge-agent",
      "action": "retrieve_context",
      "params": {{"query": "..."}},
      "dependsOn": []
    }},
    {{
      "stepId": 2,
      "agent": "investment-agent",
      "action": "analyze",
      "params": {{"symbol": "..."}},
      "dependsOn": [1]
    }}
  ]
}}

Respond with ONLY the JSON, no other text.
"""
        
        # Call Gemini
        response = model.generate_content(prompt)
        plan_text = response.text.strip()
        
        # Extract JSON from response
        if '```json' in plan_text:
            plan_text = plan_text.split('```json')[1].split('```')[0].strip()
        elif '```' in plan_text:
            plan_text = plan_text.split('```')[1].split('```')[0].strip()
        
        # Parse JSON
        plan = json.loads(plan_text)
        
        print(f"✅ Plan generated: {len(plan.get('steps', []))} steps")
        
        return {
            'planId': f"plan_{task_id}",
            'taskId': task_id,
            'correlationId': task_data.get('correlationId', task_id),
            'sequence': plan.get('sequence', []),
            'steps': plan.get('steps', []),
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
        
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse plan JSON: {e}")
        print(f"   Response: {plan_text[:200]}")
        
        # Fallback: simple sequential plan
        return generate_fallback_plan(task_data)
        
    except Exception as e:
        print(f"❌ Error generating plan: {e}")
        return generate_fallback_plan(task_data)

def generate_fallback_plan(task_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a simple fallback plan if Gemini fails
    """
    task_id = task_data.get('taskId', 'unknown')
    required_agents = task_data.get('requiredAgents', ['investment-agent'])
    
    steps = []
    for idx, agent in enumerate(required_agents, start=1):
        steps.append({
            'stepId': idx,
            'agent': agent,
            'action': 'process_query',
            'params': {
                'query': task_data.get('query', ''),
                'userId': task_data.get('userId', 'guest')
            },
            'dependsOn': [idx - 1] if idx > 1 else []
        })
    
    return {
        'planId': f"plan_{task_id}",
        'taskId': task_id,
        'correlationId': task_data.get('correlationId', task_id),
        'sequence': required_agents,
        'steps': steps,
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }

class PlanGenerator:
    """
    Flink MapFunction for plan generation
    """
    def map(self, value: str) -> str:
        try:
            # Parse input
            task_data = json.loads(value)
            
            # Generate plan
            plan = generate_execution_plan(task_data)
            
            # Return as JSON string
            return json.dumps(plan)
            
        except Exception as e:
            print(f"❌ Error in PlanGenerator: {e}")
            return json.dumps({
                'error': str(e),
                'taskId': 'unknown',
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            })

def main():
    """
    Main Flink job
    """
    # Create execution environment
    env = StreamExecutionEnvironment.get_execution_environment()
    env.set_parallelism(1)  # Single instance for thesis demo
    
    print("🔧 Setting up Kafka source...")
    
    # Kafka source for planning.tasks
    kafka_source = KafkaSource.builder() \
        .set_bootstrap_servers(KAFKA_BROKER) \
        .set_topics('planning.tasks') \
        .set_group_id('flink-planner-group') \
        .set_starting_offsets(KafkaOffsetsInitializer.latest()) \
        .set_value_only_deserializer(SimpleStringSchema()) \
        .build()
    
    print("🔧 Setting up Kafka sink...")
    
    # Kafka sink for execution.plans
    kafka_sink = KafkaSink.builder() \
        .set_bootstrap_servers(KAFKA_BROKER) \
        .set_record_serializer(
            KafkaRecordSerializationSchema.builder()
                .set_topic('execution.plans')
                .set_value_serialization_schema(SimpleStringSchema())
                .build()
        ) \
        .build()
    
    print("📊 Creating datastream pipeline...")
    
    # Create stream
    stream = env.from_source(
        kafka_source,
        WatermarkStrategy.no_watermarks(),
        "Kafka Source: planning.tasks"
    )
    
    # Transform: Generate plans
    plans = stream.map(
        lambda value: PlanGenerator().map(value),
        output_type=Types.STRING()
    )
    
    # Sink to Kafka
    plans.sink_to(kafka_sink)
    
    print("=" * 60)
    print("✅ PyFlink Planner Agent Ready")
    print("=" * 60)
    print("Listening for planning tasks...")
    print("")
    
    # Execute
    env.execute("PyFlink Planner Agent")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down gracefully...")
        sys.exit(0)
    except Exception as e:
        print(f"💥 Fatal error: {e}")
        sys.exit(1)

