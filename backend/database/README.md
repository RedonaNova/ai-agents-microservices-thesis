# Database Migration Guide

## Overview

This directory contains database schema and migration scripts for transitioning from MongoDB to PostgreSQL as the single source of truth for all application data.

## Files

- `schema.sql` - Complete PostgreSQL schema (users, portfolio, watchlist, knowledge base, monitoring)
- `migrate-users.js` - Migration script to transfer users from MongoDB to PostgreSQL

## Setup Instructions

### 1. Initialize PostgreSQL Schema

```bash
# Connect to PostgreSQL
psql -h localhost -U thesis_user -d thesis_db

# Run schema creation
\i schema.sql

# Verify tables created
\dt
```

### 2. Migrate Users from MongoDB

```bash
# Install dependencies (if not already installed)
cd backend
npm install mongodb pg dotenv

# Run migration script
node database/migrate-users.js
```

The migration script will:
- Connect to MongoDB and fetch all users
- Map MongoDB fields to PostgreSQL schema
- Insert users into PostgreSQL (with conflict handling)
- Migrate user watchlists
- Migrate user portfolios
- Provide a summary report

### 3. Verify Migration

```sql
-- Check user count
SELECT COUNT(*) FROM users;

-- View users
SELECT id, email, name, investment_goal, risk_tolerance FROM users LIMIT 10;

-- Check watchlists
SELECT u.email, w.symbol, w.added_at 
FROM users u 
JOIN user_watchlist w ON u.id = w.user_id 
LIMIT 10;

-- Check portfolios
SELECT u.email, p.symbol, p.quantity, p.purchase_price 
FROM users u 
JOIN user_portfolio p ON u.id = p.user_id 
LIMIT 10;
```

## Schema Details

### Users Table
- Primary user authentication and profile data
- Investment preferences (goal, risk tolerance, industries)
- Timestamps for tracking

### User Portfolio
- User's stock holdings
- Purchase price and date for cost basis tracking
- One-to-many relationship with users

### User Watchlist
- Stocks the user is monitoring
- Simple symbol tracking
- One-to-many relationship with users

### Knowledge Base
- Content for RAG system (FAISS will use this)
- Company profiles, API docs, business rules
- JSONB metadata for flexible data storage

### Monitoring Events
- Application logs and metrics
- Service health tracking
- Event correlation for debugging

### MSE Tables
- `mse_companies` - MSE listed companies
- `mse_trading_history` - Historical trading data

## Environment Variables

Ensure your `.env` file has:

```env
# MongoDB (for migration source)
MONGODB_URI=mongodb://localhost:27017/thesis_db

# PostgreSQL (migration target)
DB_HOST=localhost
DB_PORT=5432
DB_USER=thesis_user
DB_PASSWORD=thesis_pass
DB_NAME=thesis_db
```

## Post-Migration

After successful migration:

1. **Test Application**: Ensure user login works with PostgreSQL
2. **Update API Gateway**: Remove MongoDB client, use PostgreSQL only
3. **Remove MongoDB**: Stop MongoDB service from docker-compose
4. **Backup Data**: Export PostgreSQL for safety

```bash
# Backup PostgreSQL
pg_dump -h localhost -U thesis_user thesis_db > backup_$(date +%Y%m%d).sql
```

## Rollback

If migration fails, MongoDB data remains unchanged. To rollback PostgreSQL changes:

```sql
-- Drop all user-related tables
DROP TABLE IF EXISTS user_watchlist CASCADE;
DROP TABLE IF EXISTS user_portfolio CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Re-run schema.sql
\i schema.sql
```

## Troubleshooting

### Error: Connection refused to MongoDB
- Ensure MongoDB is running: `docker ps | grep mongo`
- Check MONGODB_URI in `.env`

### Error: Password authentication failed for PostgreSQL
- Verify DB_PASSWORD in `.env` matches docker-compose.yml
- Try connecting manually: `psql -h localhost -U thesis_user -d thesis_db`

### Error: Duplicate key violation
- Script uses `ON CONFLICT` to handle duplicates
- If error persists, check unique constraints

### No users found in MongoDB
- This is normal if starting fresh
- Schema will be ready for new registrations via API Gateway

