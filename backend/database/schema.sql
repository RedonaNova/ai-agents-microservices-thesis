-- Complete PostgreSQL Schema for Thesis Backend
-- Event-Driven AI Agents for MSE Stock Analysis

-- Drop existing tables if rebuilding
DROP TABLE IF EXISTS agent_responses_cache CASCADE;
DROP TABLE IF EXISTS mse_trading_status CASCADE;
DROP TABLE IF EXISTS mse_trading_history CASCADE;
DROP TABLE IF EXISTS mse_companies CASCADE;
DROP TABLE IF EXISTS monitoring_events CASCADE;
DROP TABLE IF EXISTS knowledge_base CASCADE;
DROP TABLE IF EXISTS watchlist_items CASCADE;
DROP TABLE IF EXISTS watchlists CASCADE;
DROP TABLE IF EXISTS user_watchlist CASCADE;
DROP TABLE IF EXISTS user_portfolio CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table (migrated from MongoDB)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    
    -- Investment Profile
    investment_goal VARCHAR(50), -- 'Growth', 'Income', 'Balanced', 'Conservative'
    risk_tolerance VARCHAR(50), -- 'Low', 'Medium', 'High'
    preferred_industries TEXT[], -- Array of industries
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    
    -- Soft delete
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- User Portfolio Table
CREATE TABLE user_portfolio (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    quantity DECIMAL(18, 8) NOT NULL,
    purchase_price DECIMAL(18, 2),
    purchase_date DATE,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, symbol)
);

CREATE INDEX idx_portfolio_user_id ON user_portfolio(user_id);
CREATE INDEX idx_portfolio_symbol ON user_portfolio(symbol);

-- User Watchlist Table (legacy - for backwards compatibility)
CREATE TABLE user_watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    UNIQUE(user_id, symbol)
);

CREATE INDEX idx_watchlist_user_id ON user_watchlist(user_id);
CREATE INDEX idx_watchlist_symbol ON user_watchlist(symbol);

-- Watchlists Table (new structure - named watchlists)
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, name)
);

CREATE INDEX idx_watchlists_user_id ON watchlists(user_id);
CREATE INDEX idx_watchlists_created_at ON watchlists(created_at);

-- Watchlist Items Table
CREATE TABLE watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    is_mse BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(watchlist_id, symbol)
);

CREATE INDEX idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);
CREATE INDEX idx_watchlist_items_symbol ON watchlist_items(symbol);

-- Knowledge Base Table (for RAG/FAISS)
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    content_type VARCHAR(50), -- 'company_profile', 'api_doc', 'business_rule', 'market_insight'
    source VARCHAR(255), -- 'MSE', 'manual', 'scraper'
    metadata JSONB, -- Additional structured data
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_knowledge_type ON knowledge_base(content_type);
CREATE INDEX idx_knowledge_metadata ON knowledge_base USING GIN(metadata);

-- Monitoring Events Table
CREATE TABLE monitoring_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'error', 'metric'
    service_name VARCHAR(100) NOT NULL, -- 'orchestrator', 'investment-agent', etc.
    message TEXT NOT NULL,
    metadata JSONB, -- Additional event data (latency, error stack, etc.)
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_monitoring_service ON monitoring_events(service_name);
CREATE INDEX idx_monitoring_type ON monitoring_events(event_type);
CREATE INDEX idx_monitoring_created_at ON monitoring_events(created_at);

-- Agent Responses Cache Table (for storing AI responses)
CREATE TABLE agent_responses_cache (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255),
    agent_type VARCHAR(50),
    query TEXT,
    response TEXT,
    status VARCHAR(50) DEFAULT 'success',
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_responses_request_id ON agent_responses_cache(request_id);
CREATE INDEX idx_responses_user_id ON agent_responses_cache(user_id);
CREATE INDEX idx_responses_created_at ON agent_responses_cache(created_at);

-- MSE Companies Table (compatible with mse-ingestion-service)
CREATE TABLE IF NOT EXISTS mse_companies (
    id SERIAL PRIMARY KEY,
    company_code INTEGER UNIQUE,
    symbol VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    sector VARCHAR(100),
    industry VARCHAR(100),
    market_segment_id VARCHAR(10), -- "I", "II"
    security_type VARCHAR(10), -- "CS" = Common Stock
    total_shares BIGINT,
    listed_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mse_companies_symbol ON mse_companies(symbol);
CREATE INDEX IF NOT EXISTS idx_mse_companies_code ON mse_companies(company_code);
CREATE INDEX IF NOT EXISTS idx_mse_companies_sector ON mse_companies(sector);

-- MSE Trading History Table (compatible with mse-ingestion-service)
CREATE TABLE IF NOT EXISTS mse_trading_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    trade_date DATE NOT NULL,
    
    opening_price DECIMAL(18, 2),
    closing_price DECIMAL(18, 2),
    high_price DECIMAL(18, 2),
    low_price DECIMAL(18, 2),
    previous_close DECIMAL(18, 2),
    
    volume BIGINT,
    turnover DECIMAL(18, 2),
    md_entry_time TIMESTAMP,
    company_code INTEGER,
    market_segment_id VARCHAR(10),
    security_type VARCHAR(10),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(symbol, trade_date)
);

CREATE INDEX IF NOT EXISTS idx_trading_symbol ON mse_trading_history(symbol);
CREATE INDEX IF NOT EXISTS idx_trading_date ON mse_trading_history(trade_date);
CREATE INDEX IF NOT EXISTS idx_trading_company_code ON mse_trading_history(company_code);

-- MSE Trading Status Table (real-time current prices)
CREATE TABLE IF NOT EXISTS mse_trading_status (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    current_price DECIMAL(18, 2),
    opening_price DECIMAL(18, 2),
    high_price DECIMAL(18, 2),
    low_price DECIMAL(18, 2),
    volume BIGINT,
    previous_close DECIMAL(18, 2),
    turnover DECIMAL(18, 2),
    change_percent DECIMAL(8, 4),
    last_trade_time TIMESTAMP,
    company_code INTEGER,
    market_segment_id VARCHAR(10),
    security_type VARCHAR(10),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_status_symbol ON mse_trading_status(symbol);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_portfolio_updated_at BEFORE UPDATE ON user_portfolio FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON mse_companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample knowledge base entries for RAG
INSERT INTO knowledge_base (content, content_type, source, metadata) VALUES
('APU (АПУ ХК) is one of the largest companies listed on MSE, primarily engaged in beverage production including beer, soft drinks, and dairy products.', 'company_profile', 'MSE', '{"symbol": "APU", "sector": "Consumer Goods"}'),
('TDB (Худалдаа Хөгжлийн Банк) is one of the largest commercial banks in Mongolia, offering comprehensive banking services.', 'company_profile', 'MSE', '{"symbol": "TDB", "sector": "Finance"}'),
('MSE trading hours: Monday to Friday, 10:00 AM - 1:00 PM Ulaanbaatar time (UTC+8)', 'business_rule', 'MSE', '{"category": "trading_hours"}'),
('Portfolio diversification recommendation: Do not allocate more than 40% of portfolio to a single sector', 'business_rule', 'manual', '{"category": "risk_management"}'),
-- Agent Capabilities for Orchestrator routing
('Investment Agent: Analyzes MSE (Mongolian Stock Exchange) stocks, provides personalized investment advice based on user risk tolerance and goals, generates market analysis reports in Mongolian.', 'agent_capability', 'system', '{"agent": "investment", "intents": ["portfolio_advice", "market_analysis", "historical_analysis", "risk_assessment"]}'),
('News Agent: Fetches financial news from Finnhub API, performs sentiment analysis using AI, summarizes news for specific stocks or market categories.', 'agent_capability', 'system', '{"agent": "news", "intents": ["news_query"]}'),
('Knowledge Agent: Provides information about MSE companies, trading rules, and financial concepts using semantic search from knowledge base.', 'agent_capability', 'system', '{"agent": "knowledge", "intents": ["general_query"]}');

-- Grant permissions (adjust user as needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO thesis_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO thesis_user;

-- Summary
SELECT 'Schema created successfully. Tables:' AS status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;

