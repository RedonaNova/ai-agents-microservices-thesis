package com.thesis.flink;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Accumulator for portfolio metrics aggregation
 */
public class PortfolioAccumulator {
    public String userId = "unknown";
    public int eventCount = 0;
    public int stocksAdded = 0;
    public int stocksRemoved = 0;
    public double totalValue = 0.0;
    public Map<String, Double> sectorValues = new HashMap<>();
    public List<String> gainers = new ArrayList<>();
    public List<String> losers = new ArrayList<>();
    public long lastUpdateTime = 0L;
    
    public PortfolioAccumulator() {
        // Default constructor
    }
}

