#!/bin/bash

# ===============================================
# Kafka Topics Creation Script
# AI Agents for Microservices
# ===============================================

set -e

KAFKA_BROKER="${KAFKA_BROKER:-localhost:9092}"
REPLICATION_FACTOR=1

echo "========================================="
echo "Creating Kafka Topics"
echo "Broker: $KAFKA_BROKER"
echo "========================================="

# Function to create topic
create_topic() {
    local topic=$1
    local partitions=$2
    local replication=$3
    
    echo "Creating topic: $topic (partitions=$partitions, replication=$replication)"
    
    kafka-topics --create \
        --bootstrap-server $KAFKA_BROKER \
        --topic $topic \
        --partitions $partitions \
        --replication-factor $replication \
        --if-not-exists \
        --config retention.ms=604800000 \
        --config segment.ms=86400000
    
    if [ $? -eq 0 ]; then
        echo "✓ Successfully created $topic"
    else
        echo "✗ Failed to create $topic"
    fi
    echo ""
}

# ===============================================
# USER INTERACTION TOPICS
# ===============================================

create_topic "user-requests" 3 $REPLICATION_FACTOR
create_topic "user-responses" 3 $REPLICATION_FACTOR

# ===============================================
# FLINK ORCHESTRATION TOPICS
# ===============================================

create_topic "agent-routing-events" 3 $REPLICATION_FACTOR
create_topic "agent-state-updates" 2 $REPLICATION_FACTOR
create_topic "response-aggregation" 3 $REPLICATION_FACTOR

# ===============================================
# PORTFOLIO AGENT TOPICS
# ===============================================

create_topic "portfolio-tasks" 2 $REPLICATION_FACTOR
create_topic "portfolio-responses" 2 $REPLICATION_FACTOR

# ===============================================
# MARKET ANALYSIS AGENT TOPICS
# ===============================================

create_topic "market-analysis-tasks" 2 $REPLICATION_FACTOR
create_topic "market-analysis-responses" 2 $REPLICATION_FACTOR

# ===============================================
# NEWS INTELLIGENCE AGENT TOPICS
# ===============================================

create_topic "news-tasks" 2 $REPLICATION_FACTOR
create_topic "news-responses" 2 $REPLICATION_FACTOR
create_topic "news-sentiment-events" 2 $REPLICATION_FACTOR

# ===============================================
# HISTORICAL ANALYSIS AGENT TOPICS
# ===============================================

create_topic "historical-tasks" 2 $REPLICATION_FACTOR
create_topic "historical-responses" 2 $REPLICATION_FACTOR

# ===============================================
# RISK ASSESSMENT AGENT TOPICS
# ===============================================

create_topic "risk-tasks" 2 $REPLICATION_FACTOR
create_topic "risk-responses" 2 $REPLICATION_FACTOR

# ===============================================
# MSE DATA STREAMING TOPICS
# ===============================================

create_topic "mse-stock-updates" 3 $REPLICATION_FACTOR
create_topic "mse-trading-history" 3 $REPLICATION_FACTOR
create_topic "mse-news-events" 2 $REPLICATION_FACTOR
create_topic "mse-price-alerts" 2 $REPLICATION_FACTOR

# ===============================================
# US STOCK DATA TOPICS
# ===============================================

create_topic "us-stock-updates" 3 $REPLICATION_FACTOR
create_topic "us-news-events" 2 $REPLICATION_FACTOR

# ===============================================
# SYSTEM & MONITORING TOPICS
# ===============================================

create_topic "monitoring-events" 1 $REPLICATION_FACTOR
create_topic "agent-health" 1 $REPLICATION_FACTOR
create_topic "system-errors" 1 $REPLICATION_FACTOR

# ===============================================
# RAG SYSTEM TOPICS
# ===============================================

create_topic "rag-embedding-requests" 2 $REPLICATION_FACTOR
create_topic "rag-query-results" 2 $REPLICATION_FACTOR

echo "========================================="
echo "Topic Creation Complete!"
echo "========================================="
echo ""
echo "Listing all topics:"
kafka-topics --list --bootstrap-server $KAFKA_BROKER

echo ""
echo "To verify topic details, run:"
echo "kafka-topics --describe --bootstrap-server $KAFKA_BROKER --topic <topic-name>"

