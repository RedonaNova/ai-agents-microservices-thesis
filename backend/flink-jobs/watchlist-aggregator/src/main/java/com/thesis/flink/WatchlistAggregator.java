package com.thesis.flink;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.AggregateFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.TumblingProcessingTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Flink Job: Watchlist Aggregator
 * 
 * Consumes watchlist events from Kafka and aggregates portfolio metrics:
 * - Total portfolio value
 * - Sector allocation
 * - Top gainers/losers
 * - Daily P&L
 * 
 * For thesis demonstration of event-driven microservices architecture.
 */
public class WatchlistAggregator {
    
    private static final Logger LOG = LoggerFactory.getLogger(WatchlistAggregator.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    public static void main(String[] args) throws Exception {
        // Set up Flink execution environment
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Enable checkpointing for fault tolerance
        env.enableCheckpointing(60000); // checkpoint every 60 seconds
        
        // Kafka configuration
        String kafkaBootstrapServers = System.getenv().getOrDefault("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092");
        
        LOG.info("Starting Watchlist Aggregator Flink Job");
        LOG.info("Kafka Bootstrap Servers: {}", kafkaBootstrapServers);
        
        // Create Kafka source for watchlist events
        KafkaSource<String> source = KafkaSource.<String>builder()
                .setBootstrapServers(kafkaBootstrapServers)
                .setTopics("user-watchlist-events")
                .setGroupId("flink-watchlist-aggregator")
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();
        
        // Create Kafka sink for analytics results
        KafkaSink<String> sink = KafkaSink.<String>builder()
                .setBootstrapServers(kafkaBootstrapServers)
                .setRecordSerializer(KafkaRecordSerializationSchema.builder()
                        .setTopic("watchlist-analytics")
                        .setValueSerializationSchema(new SimpleStringSchema())
                        .build())
                .build();
        
        // Read from Kafka
        DataStream<String> watchlistEvents = env
                .fromSource(source, WatermarkStrategy.noWatermarks(), "Watchlist Events Source");
        
        // Process and aggregate watchlist data
        DataStream<String> aggregatedAnalytics = watchlistEvents
                // Parse JSON
                .map(event -> {
                    try {
                        return objectMapper.readTree(event);
                    } catch (Exception e) {
                        LOG.error("Failed to parse event: {}", event, e);
                        return null;
                    }
                })
                .filter(node -> node != null)
                // Key by userId
                .keyBy(node -> node.has("userId") ? node.get("userId").asText() : "unknown")
                // Window: 5-minute tumbling windows
                .window(TumblingProcessingTimeWindows.of(Time.minutes(5)))
                // Aggregate portfolio metrics
                .aggregate(new PortfolioAggregateFunction())
                // Convert back to JSON string
                .map(portfolioMetrics -> objectMapper.writeValueAsString(portfolioMetrics));
        
        // Write results to Kafka
        aggregatedAnalytics.sinkTo(sink).name("Watchlist Analytics Sink");
        
        // Print to console for debugging
        aggregatedAnalytics.print().name("Console Debug Output");
        
        // Execute the Flink job
        env.execute("Watchlist Aggregator");
        
        LOG.info("Watchlist Aggregator job completed");
    }
    
    /**
     * Aggregate function to compute portfolio metrics
     */
    public static class PortfolioAggregateFunction implements AggregateFunction<JsonNode, PortfolioAccumulator, ObjectNode> {
        
        @Override
        public PortfolioAccumulator createAccumulator() {
            return new PortfolioAccumulator();
        }
        
        @Override
        public PortfolioAccumulator add(JsonNode event, PortfolioAccumulator accumulator) {
            try {
                String action = event.has("action") ? event.get("action").asText() : "";
                String symbol = event.has("symbol") ? event.get("symbol").asText() : "";
                String sector = event.has("sector") ? event.get("sector").asText() : "Unknown";
                double price = event.has("price") ? event.get("price").asDouble() : 0.0;
                double changePercent = event.has("changePercent") ? event.get("changePercent").asDouble() : 0.0;
                
                accumulator.userId = event.has("userId") ? event.get("userId").asText() : "unknown";
                accumulator.eventCount++;
                
                if ("ADD".equals(action)) {
                    accumulator.stocksAdded++;
                    accumulator.totalValue += price;
                    
                    // Track sector allocation
                    accumulator.sectorValues.put(sector, 
                            accumulator.sectorValues.getOrDefault(sector, 0.0) + price);
                    
                    // Track top gainers
                    if (changePercent > 0) {
                        accumulator.gainers.add(symbol + ":" + changePercent);
                    } else if (changePercent < 0) {
                        accumulator.losers.add(symbol + ":" + changePercent);
                    }
                } else if ("REMOVE".equals(action)) {
                    accumulator.stocksRemoved++;
                }
                
                accumulator.lastUpdateTime = System.currentTimeMillis();
                
            } catch (Exception e) {
                LOG.error("Error processing event in aggregator", e);
            }
            
            return accumulator;
        }
        
        @Override
        public ObjectNode getResult(PortfolioAccumulator accumulator) {
            ObjectNode result = objectMapper.createObjectNode();
            
            result.put("userId", accumulator.userId);
            result.put("eventCount", accumulator.eventCount);
            result.put("stocksAdded", accumulator.stocksAdded);
            result.put("stocksRemoved", accumulator.stocksRemoved);
            result.put("totalPortfolioValue", accumulator.totalValue);
            result.put("lastUpdateTime", accumulator.lastUpdateTime);
            result.put("windowEndTime", System.currentTimeMillis());
            
            // Sector allocation
            ObjectNode sectors = result.putObject("sectorAllocation");
            accumulator.sectorValues.forEach((sector, value) -> {
                double percentage = accumulator.totalValue > 0 
                        ? (value / accumulator.totalValue) * 100 
                        : 0.0;
                sectors.put(sector, Math.round(percentage * 100) / 100.0);
            });
            
            // Top gainers (limit to 5)
            result.putArray("topGainers").addAll(
                    accumulator.gainers.stream()
                            .sorted((a, b) -> Double.compare(
                                    Double.parseDouble(b.split(":")[1]),
                                    Double.parseDouble(a.split(":")[1])))
                            .limit(5)
                            .map(objectMapper::valueToTree)
                            .toList());
            
            // Top losers (limit to 5)
            result.putArray("topLosers").addAll(
                    accumulator.losers.stream()
                            .sorted((a, b) -> Double.compare(
                                    Double.parseDouble(a.split(":")[1]),
                                    Double.parseDouble(b.split(":")[1])))
                            .limit(5)
                            .map(objectMapper::valueToTree)
                            .toList());
            
            return result;
        }
        
        @Override
        public PortfolioAccumulator merge(PortfolioAccumulator a, PortfolioAccumulator b) {
            a.eventCount += b.eventCount;
            a.stocksAdded += b.stocksAdded;
            a.stocksRemoved += b.stocksRemoved;
            a.totalValue += b.totalValue;
            
            // Merge sector values
            b.sectorValues.forEach((sector, value) -> 
                    a.sectorValues.put(sector, a.sectorValues.getOrDefault(sector, 0.0) + value));
            
            // Merge gainers and losers
            a.gainers.addAll(b.gainers);
            a.losers.addAll(b.losers);
            
            a.lastUpdateTime = Math.max(a.lastUpdateTime, b.lastUpdateTime);
            
            return a;
        }
    }
}

