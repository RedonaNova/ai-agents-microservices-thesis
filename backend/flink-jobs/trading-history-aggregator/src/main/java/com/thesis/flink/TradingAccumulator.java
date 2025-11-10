package com.thesis.flink;

import java.util.ArrayList;
import java.util.List;

/**
 * Accumulator for trading indicators aggregation
 */
public class TradingAccumulator {
    public String symbol = "unknown";
    public double priceSum = 0.0;
    public long volumeSum = 0L;
    public double volumePriceSum = 0.0;  // For VWAP calculation
    public int tradeCount = 0;
    public double high = 0.0;
    public double low = 0.0;
    public double lastPrice = 0.0;
    public List<Double> prices = new ArrayList<>();  // For moving average
    public long lastUpdateTime = 0L;
    
    public TradingAccumulator() {
        // Default constructor
    }
}

