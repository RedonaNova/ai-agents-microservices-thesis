-- ===============================================
-- AI Agents for Microservices - Database Schema
-- ===============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- USER & AUTHENTICATION TABLES
-- ===============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100),
    investment_goals TEXT,
    risk_tolerance VARCHAR(50) CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    preferred_industry VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ===============================================
-- MSE (MONGOLIAN STOCK EXCHANGE) TABLES
-- ===============================================

-- MSE Companies
CREATE TABLE mse_companies (
    company_code INTEGER PRIMARY KEY,
    symbol VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    market_segment_id VARCHAR(50), -- 'I classification', 'II classification', 'III classification'
    security_type VARCHAR(50) DEFAULT 'CS', -- CS = Common Stock
    listed_shares BIGINT,
    listing_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mse_companies_symbol ON mse_companies(symbol);
CREATE INDEX idx_mse_companies_sector ON mse_companies(sector);

-- MSE Trading History (from API)
CREATE TABLE mse_trading_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    opening_price DECIMAL(20,2),
    closing_price DECIMAL(20,2),
    high_price DECIMAL(20,2),
    low_price DECIMAL(20,2),
    volume BIGINT,
    previous_close DECIMAL(20,2),
    turnover DECIMAL(20,2),
    md_entry_time TIMESTAMP, -- Last trade time
    company_code INTEGER,
    market_segment_id VARCHAR(50),
    security_type VARCHAR(50),
    trade_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(symbol, trade_date)
);

CREATE INDEX idx_mse_trading_history_symbol ON mse_trading_history(symbol);
CREATE INDEX idx_mse_trading_history_date ON mse_trading_history(trade_date DESC);
CREATE INDEX idx_mse_trading_history_symbol_date ON mse_trading_history(symbol, trade_date DESC);
CREATE INDEX idx_mse_trading_history_company_code ON mse_trading_history(company_code);

-- MSE Trading Status (real-time)
CREATE TABLE mse_trading_status (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    current_price DECIMAL(20,2),
    opening_price DECIMAL(20,2),
    high_price DECIMAL(20,2),
    low_price DECIMAL(20,2),
    volume BIGINT,
    previous_close DECIMAL(20,2),
    turnover BIGINT,
    change_percent DECIMAL(10,4),
    last_trade_time TIMESTAMP,
    company_code INTEGER REFERENCES mse_companies(company_code),
    market_segment_id VARCHAR(50),
    security_type VARCHAR(50),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(symbol)
);

CREATE INDEX idx_mse_trading_status_symbol ON mse_trading_status(symbol);
CREATE INDEX idx_mse_trading_status_updated ON mse_trading_status(updated_at DESC);

-- ===============================================
-- US STOCKS (Optional - for comparison)
-- ===============================================

CREATE TABLE us_stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    exchange VARCHAR(50), -- 'NASDAQ', 'NYSE', etc.
    sector VARCHAR(100),
    industry VARCHAR(100),
    market_cap BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_us_stocks_symbol ON us_stocks(symbol);
CREATE INDEX idx_us_stocks_sector ON us_stocks(sector);

-- ===============================================
-- PORTFOLIO & WATCHLIST
-- ===============================================

CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    market VARCHAR(20) NOT NULL CHECK (market IN ('MSE', 'US')),
    quantity DECIMAL(20,8) NOT NULL,
    avg_purchase_price DECIMAL(20,2) NOT NULL,
    purchase_date TIMESTAMP NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_symbol ON portfolios(symbol);
CREATE INDEX idx_portfolios_market ON portfolios(market);

CREATE TABLE watchlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    market VARCHAR(20) NOT NULL CHECK (market IN ('MSE', 'US')),
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, symbol, market)
);

CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX idx_watchlist_symbol ON watchlist(symbol);

-- ===============================================
-- AGENT SYSTEM TABLES
-- ===============================================

-- Agent Interactions (for evaluation and history)
CREATE TABLE agent_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    correlation_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    intent VARCHAR(100),
    primary_agent VARCHAR(100),
    secondary_agents TEXT[], -- Array of agent names
    routing_decision JSONB, -- Full routing decision from Flink
    response JSONB NOT NULL,
    latency_ms INTEGER,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,6),
    model VARCHAR(100) DEFAULT 'gemini-1.5-flash',
    status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'error', 'timeout'
    error_message TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_interactions_user_id ON agent_interactions(user_id);
CREATE INDEX idx_agent_interactions_created_at ON agent_interactions(created_at DESC);
CREATE INDEX idx_agent_interactions_correlation_id ON agent_interactions(correlation_id);
CREATE INDEX idx_agent_interactions_primary_agent ON agent_interactions(primary_agent);

-- Agent State (for Flink stateful processing)
CREATE TABLE agent_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    state_key VARCHAR(255) NOT NULL,
    state_value JSONB NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, agent_name, state_key)
);

CREATE INDEX idx_agent_state_user_agent ON agent_state(user_id, agent_name);
CREATE INDEX idx_agent_state_expires ON agent_state(expires_at) WHERE expires_at IS NOT NULL;

-- Agent Performance Metrics (for thesis evaluation)
CREATE TABLE agent_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(20,4) NOT NULL,
    metadata JSONB,
    recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_metrics_agent ON agent_metrics(agent_name);
CREATE INDEX idx_agent_metrics_recorded ON agent_metrics(recorded_at DESC);

-- ===============================================
-- NEWS & SENTIMENT
-- ===============================================

CREATE TABLE news_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(50),
    market VARCHAR(20) CHECK (market IN ('MSE', 'US', 'GLOBAL')),
    headline TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    source VARCHAR(100),
    url TEXT,
    published_at TIMESTAMP NOT NULL,
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
    impact_level VARCHAR(20) CHECK (impact_level IN ('high', 'medium', 'low')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_news_symbol ON news_articles(symbol);
CREATE INDEX idx_news_published_at ON news_articles(published_at DESC);
CREATE INDEX idx_news_market ON news_articles(market);
CREATE INDEX idx_news_sentiment ON news_articles(sentiment);

-- ===============================================
-- RAG SYSTEM
-- ===============================================

-- Embeddings Metadata (actual vectors stored in Qdrant)
CREATE TABLE embeddings_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_type VARCHAR(50) NOT NULL, -- 'company_profile', 'market_analysis', 'news', 'research'
    document_id VARCHAR(255) NOT NULL,
    symbol VARCHAR(50),
    market VARCHAR(20),
    vector_id VARCHAR(255) NOT NULL, -- Qdrant point ID
    content_preview TEXT, -- First 200 chars for reference
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(document_type, document_id)
);

CREATE INDEX idx_embeddings_document_type ON embeddings_metadata(document_type);
CREATE INDEX idx_embeddings_symbol ON embeddings_metadata(symbol);
CREATE INDEX idx_embeddings_vector_id ON embeddings_metadata(vector_id);

-- ===============================================
-- ALERTS & NOTIFICATIONS
-- ===============================================

CREATE TABLE price_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    market VARCHAR(20) NOT NULL,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('above', 'below')),
    threshold_price DECIMAL(20,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = true;

-- ===============================================
-- SYSTEM EVENTS & MONITORING
-- ===============================================

CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    event_source VARCHAR(100) NOT NULL, -- 'agent', 'flink', 'kafka', 'frontend'
    severity VARCHAR(20) CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_events_type ON system_events(event_type);
CREATE INDEX idx_system_events_severity ON system_events(severity);
CREATE INDEX idx_system_events_created ON system_events(created_at DESC);

-- ===============================================
-- VIEWS FOR COMMON QUERIES
-- ===============================================

-- MSE Latest Prices View
CREATE OR REPLACE VIEW vw_mse_latest_prices AS
SELECT 
    c.company_code,
    c.symbol,
    c.name,
    c.sector,
    c.market_segment_id,
    h.closing_price as latest_price,
    h.volume as latest_volume,
    h.turnover as latest_turnover,
    h.opening_price,
    h.high_price,
    h.low_price,
    h.previous_close,
    CASE 
        WHEN h.previous_close > 0 
        THEN ((h.closing_price - h.previous_close) / h.previous_close) * 100 
        ELSE 0 
    END as change_percent,
    h.trade_date as last_trade_date
FROM mse_companies c
LEFT JOIN LATERAL (
    SELECT *
    FROM mse_trading_history
    WHERE symbol = c.symbol
    ORDER BY trade_date DESC
    LIMIT 1
) h ON true;

-- User Portfolio Value View
CREATE OR REPLACE VIEW vw_portfolio_values AS
SELECT 
    p.id,
    p.user_id,
    p.symbol,
    p.company_name,
    p.market,
    p.quantity,
    p.avg_purchase_price,
    p.purchase_date,
    CASE 
        WHEN p.market = 'MSE' THEN m.closing_price
        ELSE NULL -- Would join with US stock prices
    END as current_price,
    CASE 
        WHEN p.market = 'MSE' AND m.closing_price IS NOT NULL 
        THEN p.quantity * m.closing_price
        ELSE p.quantity * p.avg_purchase_price
    END as current_value,
    CASE 
        WHEN p.market = 'MSE' AND m.closing_price IS NOT NULL 
        THEN (p.quantity * m.closing_price) - (p.quantity * p.avg_purchase_price)
        ELSE 0
    END as unrealized_gain_loss,
    CASE 
        WHEN p.market = 'MSE' AND m.closing_price IS NOT NULL AND p.avg_purchase_price > 0
        THEN ((m.closing_price - p.avg_purchase_price) / p.avg_purchase_price) * 100
        ELSE 0
    END as return_percent
FROM portfolios p
LEFT JOIN LATERAL (
    SELECT closing_price
    FROM mse_trading_history
    WHERE symbol = p.symbol
    ORDER BY trade_date DESC
    LIMIT 1
) m ON p.market = 'MSE';

-- ===============================================
-- FUNCTIONS
-- ===============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update_updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mse_companies_updated_at BEFORE UPDATE ON mse_companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_state_updated_at BEFORE UPDATE ON agent_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- COMMENTS
-- ===============================================

COMMENT ON TABLE mse_trading_history IS 'Historical trading data from MSE API';
COMMENT ON TABLE mse_trading_status IS 'Real-time trading status from MSE';
COMMENT ON TABLE agent_interactions IS 'Logs all agent interactions for evaluation';
COMMENT ON TABLE agent_state IS 'Maintains stateful context for Flink agents';
COMMENT ON TABLE embeddings_metadata IS 'Metadata for RAG system vectors in Qdrant';

-- ===============================================
-- GRANTS
-- ===============================================

-- Grant permissions to thesis_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO thesis_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO thesis_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO thesis_user;

