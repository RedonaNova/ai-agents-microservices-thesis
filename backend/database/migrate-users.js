#!/usr/bin/env node

/**
 * Migration Script: MongoDB Users → PostgreSQL
 * 
 * This script migrates user data from MongoDB to PostgreSQL
 * Run with: node migrate-users.js
 */

const { MongoClient } = require('mongodb');
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

// MongoDB connection
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/thesis_db';
const mongoClient = new MongoClient(MONGO_URI);

// PostgreSQL connection
const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'thesis_user',
  password: process.env.DB_PASSWORD || 'thesis_pass',
  database: process.env.DB_NAME || 'thesis_db',
});

async function migrateUsers() {
  console.log('🚀 Starting MongoDB → PostgreSQL user migration...\n');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoClient.connect();
    const mongoDb = mongoClient.db();
    const usersCollection = mongoDb.collection('users');
    
    // Connect to PostgreSQL
    console.log('📡 Connecting to PostgreSQL...');
    await pgPool.connect();
    
    // Fetch all users from MongoDB
    console.log('📥 Fetching users from MongoDB...');
    const mongoUsers = await usersCollection.find({}).toArray();
    console.log(`   Found ${mongoUsers.length} users\n`);
    
    if (mongoUsers.length === 0) {
      console.log('⚠️  No users found in MongoDB. Skipping migration.');
      return;
    }
    
    // Migrate each user
    let successCount = 0;
    let errorCount = 0;
    
    for (const mongoUser of mongoUsers) {
      try {
        // Map MongoDB fields to PostgreSQL schema
        const pgUser = {
          email: mongoUser.email,
          password_hash: mongoUser.password || mongoUser.passwordHash || '',
          name: mongoUser.name || mongoUser.email.split('@')[0],
          investment_goal: mongoUser.investmentGoal || mongoUser.investment_goal || null,
          risk_tolerance: mongoUser.riskTolerance || mongoUser.risk_tolerance || null,
          preferred_industries: mongoUser.preferredIndustries || mongoUser.preferred_industries || [],
          created_at: mongoUser.createdAt || mongoUser.created_at || new Date(),
          last_login: mongoUser.lastLogin || mongoUser.last_login || null,
        };
        
        // Insert into PostgreSQL
        const result = await pgPool.query(
          `INSERT INTO users (email, password_hash, name, investment_goal, risk_tolerance, preferred_industries, created_at, last_login)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (email) DO UPDATE 
           SET name = EXCLUDED.name,
               investment_goal = EXCLUDED.investment_goal,
               risk_tolerance = EXCLUDED.risk_tolerance,
               preferred_industries = EXCLUDED.preferred_industries,
               updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
          [
            pgUser.email,
            pgUser.password_hash,
            pgUser.name,
            pgUser.investment_goal,
            pgUser.risk_tolerance,
            pgUser.preferred_industries,
            pgUser.created_at,
            pgUser.last_login
          ]
        );
        
        const userId = result.rows[0].id;
        console.log(`✅ Migrated user: ${pgUser.email} (ID: ${userId})`);
        
        // Migrate watchlist if exists
        if (mongoUser.watchlist && Array.isArray(mongoUser.watchlist)) {
          for (const symbol of mongoUser.watchlist) {
            await pgPool.query(
              `INSERT INTO user_watchlist (user_id, symbol)
               VALUES ($1, $2)
               ON CONFLICT (user_id, symbol) DO NOTHING`,
              [userId, symbol]
            );
          }
          console.log(`   📊 Migrated ${mongoUser.watchlist.length} watchlist items`);
        }
        
        // Migrate portfolio if exists
        if (mongoUser.portfolio && Array.isArray(mongoUser.portfolio)) {
          for (const holding of mongoUser.portfolio) {
            await pgPool.query(
              `INSERT INTO user_portfolio (user_id, symbol, quantity, purchase_price, purchase_date)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (user_id, symbol) DO UPDATE
               SET quantity = EXCLUDED.quantity,
                   purchase_price = EXCLUDED.purchase_price,
                   updated_at = CURRENT_TIMESTAMP`,
              [
                userId,
                holding.symbol,
                holding.quantity || 0,
                holding.purchasePrice || holding.purchase_price || null,
                holding.purchaseDate || holding.purchase_date || null
              ]
            );
          }
          console.log(`   💼 Migrated ${mongoUser.portfolio.length} portfolio items`);
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating user ${mongoUser.email}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors:  ${errorCount}`);
    console.log(`   📈 Total:   ${mongoUsers.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Verify migration
    const { rows } = await pgPool.query('SELECT COUNT(*) FROM users');
    console.log(`✅ PostgreSQL now has ${rows[0].count} users\n`);
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoClient.close();
    await pgPool.end();
  }
}

// Run migration
migrateUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

