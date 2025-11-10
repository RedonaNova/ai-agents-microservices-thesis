#!/bin/bash

# Kafka Topics Initialization Script
# Creates all required topics for Event-Driven AI Agents Architecture

set -e

KAFKA_BROKER="${KAFKA_BROKER:-localhost:9092}"
PARTITIONS="${PARTITIONS:-3}"
REPLICATION_FACTOR="${REPLICATION_FACTOR:-1}"

echo "🚀 Creating Kafka Topics for Thesis Architecture"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Broker: $KAFKA_BROKER"
echo "Partitions: $PARTITIONS"
echo "Replication Factor: $REPLICATION_FACTOR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for Kafka to be ready
echo "⏳ Waiting for Kafka broker to be ready..."
while ! kafka-broker-api-versions --bootstrap-server $KAFKA_BROKER > /dev/null 2>&1; do
    echo "   Kafka not ready yet, waiting..."
    sleep 3
done
echo "✅ Kafka is ready!"
echo ""

# Function to create topic
create_topic() {
    local topic_name=$1
    local description=$2
    
    echo "📨 Creating topic: $topic_name"
    echo "   Description: $description"
    
    kafka-topics --bootstrap-server $KAFKA_BROKER \
        --create \
        --if-not-exists \
        --topic $topic_name \
        --partitions $PARTITIONS \
        --replication-factor $REPLICATION_FACTOR \
        --config retention.ms=604800000 \
        --config compression.type=snappy \
        --config max.message.bytes=10485760
    
    echo "   ✅ Created"
    echo ""
}

# Core Communication Topics
create_topic "user.requests" "User AI queries from API Gateway"
create_topic "agent.tasks" "Tasks routed to specific agents"
create_topic "agent.responses" "Responses from agents to users"

# Planning & Execution Topics
create_topic "planning.tasks" "Complex workflows requiring execution planning"
create_topic "execution.plans" "Generated plans from Flink Planner Agent"

# Knowledge & RAG Topics
create_topic "knowledge.queries" "Queries to Knowledge Agent for RAG retrieval"
create_topic "knowledge.results" "Retrieved context from Knowledge Agent"

# Service-Level Topics
create_topic "service.calls" "Direct service operation calls (CRUD, etc.)"
create_topic "service.results" "Results from service operations"

# Domain Event Topics
create_topic "user.events" "User lifecycle events (registration, login, profile updates)"
create_topic "news.events" "Financial news events and sentiment analysis"

# Monitoring & Observability
create_topic "monitoring.events" "System logs, metrics, and health events"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Topic List:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

kafka-topics --bootstrap-server $KAFKA_BROKER --list | grep -E "user\.|agent\.|planning\.|execution\.|knowledge\.|service\.|news\.|monitoring\." | sort

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All topics created successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 To view topic details:"
echo "   kafka-topics --bootstrap-server $KAFKA_BROKER --describe --topic <topic-name>"
echo ""
echo "💡 To consume messages (for debugging):"
echo "   kafka-console-consumer --bootstrap-server $KAFKA_BROKER --topic <topic-name> --from-beginning"
echo ""

