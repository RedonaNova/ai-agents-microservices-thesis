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
import org.apache.flink.streaming.api.windowing.assigners.SlidingProcessingTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Flink Job: Trading History Aggregator
 * 
 * Consumes MSE trading events and computes real-time technical indicators:
 * - Moving averages (5min, 1hour, 1day)
 * - VWAP (Volume Weighted Average Price)
 * - Momentum indicators
 * - Trading volume aggregation
 * 
 * Demonstrates stream processing capabilities for thesis.
 */
public class TradingHistoryAggregator {
    
    private static final Logger LOG = LoggerFactory.getLogger(TradingHistoryAggregator.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    public static void main(String[] args) throws Exception {
        // Set up Flink execution environment
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        
        // Enable checkpointing for fault tolerance
        env.enableCheckpointing(60000); // checkpoint every 60 seconds
        
        // Set parallelism
        env.setParallelism(2);
        
        // Kafka configuration
        String kafkaBootstrapServers = System.getenv().getOrDefault("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092");
        
        LOG.info("Starting Trading History Aggregator Flink Job");
        LOG.info("Kafka Bootstrap Servers: {}", kafkaBootstrapServers);
        
        // Create Kafka source for MSE trading events
        KafkaSource<String> source = KafkaSource.<String>builder()
                .setBootstrapServers(kafkaBootstrapServers)
                .setTopics("mse-trading-events")
                .setGroupId("flink-trading-aggregator")
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();
        
        // Create Kafka sink for analytics results
        KafkaSink<String> sink = KafkaSink.<String>builder()
                .setBootstrapServers(kafkaBootstrapServers)
                .setRecordSerializer(KafkaRecordSerializationSchema.builder()
                        .setTopic("trading-analytics")
                        .setValueSerializationSchema(new SimpleStringSchema())
                        .build())
                .build();
        
        // Read from Kafka
        DataStream<String> tradingEvents = env
                .fromSource(source, WatermarkStrategy.noWatermarks(), "Trading Events Source");
        
        // Process 5-minute window aggregations
        DataStream<String> fiveMinAggregates = processWindow(
                tradingEvents, 
                Time.minutes(5), 
                Time.minutes(1),
                "5min");
        
        // Process 1-hour window aggregations
        DataStream<String> oneHourAggregates = processWindow(
                tradingEvents, 
                Time.hours(1), 
                Time.minutes(5),
                "1hour");
        
        // Process 1-day window aggregations
        DataStream<String> oneDayAggregates = processWindow(
                tradingEvents, 
                Time.days(1), 
                Time.hours(1),
                "1day");
        
        // Union all streams
        DataStream<String> allAggregates = fiveMinAggregates
                .union(oneHourAggregates)
                .union(oneDayAggregates);
        
        // Write results to Kafka
        allAggregates.sinkTo(sink).name("Trading Analytics Sink");
        
        // Print to console for debugging
        allAggregates.print().name("Console Debug Output");
        
        // Execute the Flink job
        env.execute("Trading History Aggregator");
        
        LOG.info("Trading History Aggregator job completed");
    }
    
    /**
     * Process windowed aggregations for a given window size
     */
    private static DataStream<String> processWindow(
            DataStream<String> stream, 
            Time windowSize, 
            Time slideSize,
            String windowLabel) {
        
        return stream
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
                // Key by symbol
                .keyBy(node -> node.has("symbol") ? node.get("symbol").asText() : "unknown")
                // Sliding window
                .window(SlidingProcessingTimeWindows.of(windowSize, slideSize))
                // Aggregate technical indicators
                .aggregate(new TradingIndicatorsAggregateFunction(windowLabel))
                // Convert back to JSON string
                .map(indicators -> objectMapper.writeValueAsString(indicators));
    }
    
    /**
     * Aggregate function to compute technical indicators
     */
    public static class TradingIndicatorsAggregateFunction implements AggregateFunction<JsonNode, TradingAccumulator, ObjectNode> {
        
        private final String windowLabel;
        
        public TradingIndicatorsAggregateFunction(String windowLabel) {
            this.windowLabel = windowLabel;
        }
        
        @Override
        public TradingAccumulator createAccumulator() {
            return new TradingAccumulator();
        }
        
        @Override
        public TradingAccumulator add(JsonNode event, TradingAccumulator accumulator) {
            try {
                String symbol = event.has("symbol") ? event.get("symbol").asText() : "unknown";
                double price = event.has("closingPrice") ? event.get("closingPrice").asDouble() : 0.0;
                long volume = event.has("volume") ? event.get("volume").asLong() : 0L;
                
                accumulator.symbol = symbol;
                accumulator.priceSum += price;
                accumulator.volumeSum += volume;
                accumulator.volumePriceSum += (price * volume);
                accumulator.tradeCount++;
                
                // Track price history for moving average
                accumulator.prices.add(price);
                
                // Track min/max
                if (accumulator.high == 0 || price > accumulator.high) {
                    accumulator.high = price;
                }
                if (accumulator.low == 0 || price < accumulator.low) {
                    accumulator.low = price;
                }
                
                accumulator.lastPrice = price;
                accumulator.lastUpdateTime = System.currentTimeMillis();
                
            } catch (Exception e) {
                LOG.error("Error processing trading event in aggregator", e);
            }
            
            return accumulator;
        }
        
        @Override
        public ObjectNode getResult(TradingAccumulator accumulator) {
            ObjectNode result = objectMapper.createObjectNode();
            
            result.put("symbol", accumulator.symbol);
            result.put("window", windowLabel);
            result.put("tradeCount", accumulator.tradeCount);
            result.put("totalVolume", accumulator.volumeSum);
            result.put("high", accumulator.high);
            result.put("low", accumulator.low);
            result.put("lastPrice", accumulator.lastPrice);
            result.put("lastUpdateTime", accumulator.lastUpdateTime);
            result.put("windowEndTime", System.currentTimeMillis());
            
            // Calculate average price
            double avgPrice = accumulator.tradeCount > 0 
                    ? accumulator.priceSum / accumulator.tradeCount 
                    : 0.0;
            result.put("avgPrice", Math.round(avgPrice * 100) / 100.0);
            
            // Calculate VWAP (Volume Weighted Average Price)
            double vwap = accumulator.volumeSum > 0 
                    ? accumulator.volumePriceSum / accumulator.volumeSum 
                    : 0.0;
            result.put("vwap", Math.round(vwap * 100) / 100.0);
            
            // Calculate simple moving average
            double sma = accumulator.prices.isEmpty() ? 0.0 
                    : accumulator.prices.stream().mapToDouble(d -> d).average().orElse(0.0);
            result.put("sma", Math.round(sma * 100) / 100.0);
            
            // Calculate momentum (price change)
            if (accumulator.prices.size() >= 2) {
                double firstPrice = accumulator.prices.get(0);
                double momentum = ((accumulator.lastPrice - firstPrice) / firstPrice) * 100;
                result.put("momentum", Math.round(momentum * 100) / 100.0);
            } else {
                result.put("momentum", 0.0);
            }
            
            // Calculate volatility (standard deviation)
            if (accumulator.prices.size() > 1) {
                double mean = sma;
                double variance = accumulator.prices.stream()
                        .mapToDouble(price -> Math.pow(price - mean, 2))
                        .average()
                        .orElse(0.0);
                double stdDev = Math.sqrt(variance);
                result.put("volatility", Math.round(stdDev * 100) / 100.0);
            } else {
                result.put("volatility", 0.0);
            }
            
            return result;
        }
        
        @Override
        public TradingAccumulator merge(TradingAccumulator a, TradingAccumulator b) {
            a.priceSum += b.priceSum;
            a.volumeSum += b.volumeSum;
            a.volumePriceSum += b.volumePriceSum;
            a.tradeCount += b.tradeCount;
            
            // Merge price lists
            a.prices.addAll(b.prices);
            
            // Update min/max
            if (b.high > a.high) a.high = b.high;
            if (a.low == 0 || (b.low > 0 && b.low < a.low)) a.low = b.low;
            
            // Use latest price
            if (b.lastUpdateTime > a.lastUpdateTime) {
                a.lastPrice = b.lastPrice;
                a.lastUpdateTime = b.lastUpdateTime;
            }
            
            return a;
        }
    }
}

