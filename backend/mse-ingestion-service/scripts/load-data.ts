import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import database from '../src/database';
import kafkaProducer from '../src/kafka-producer';
import logger from '../src/logger';
import { MSETradingHistory, MSETradingStatus } from '../src/types';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function loadTradingHistory() {
  const filePath = path.join(__dirname, '../data/TradingHistory.json');
  
  logger.info('Loading Trading History data...');
  logger.info(`File: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  logger.info('Parsing JSON...');
  
  const data = JSON.parse(fileContent);
  const records: MSETradingHistory[] = Array.isArray(data) ? data : data.data || [];
  
  logger.info(`Parsed ${records.length} records`);

  // Process in batches of 1000
  const batchSize = 1000;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(records.length / batchSize);
    
    logger.info(`Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);

    try {
      // Insert into database
      for (const record of batch) {
        try {
          await database.insertTradingHistory(record);
          
          // Also upsert company info
          await database.upsertCompany({
            companycode: record.companycode,
            Symbol: record.Symbol,
            Name: record.Name,
            MarketSegmentID: record.MarketSegmentID,
            securityType: record.securityType
          });
          
          successCount++;
        } catch (err) {
          errorCount++;
          if (errorCount < 10) {
            logger.warn(`Failed to insert record for ${record.Symbol}`, { error: err });
          }
        }
      }

      // Publish to Kafka in batches
      try {
        await kafkaProducer.publishStockUpdatesBatch(batch);
      } catch (err) {
        logger.warn('Failed to publish batch to Kafka', { error: err });
      }

      logger.info(`✓ Batch ${batchNum} complete. Total: ${successCount} success, ${errorCount} errors`);
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      logger.error(`Error processing batch ${batchNum}`, { error });
    }
  }

  logger.info('='.repeat(60));
  logger.info('Trading History Loading Complete!');
  logger.info(`Total records: ${records.length}`);
  logger.info(`Successfully inserted: ${successCount}`);
  logger.info(`Errors: ${errorCount}`);
  logger.info('='.repeat(60));
}

async function loadTradingStatus() {
  const filePath = path.join(__dirname, '../data/TradingStatus.json');
  
  logger.info('Loading Trading Status data...');
  logger.info(`File: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    logger.warn(`File not found: ${filePath}. Skipping trading status.`);
    return;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  logger.info('Parsing JSON...');
  
  const data = JSON.parse(fileContent);
  const records: MSETradingStatus[] = Array.isArray(data) ? data : data.data || [];
  
  logger.info(`Parsed ${records.length} records`);

  let successCount = 0;
  let errorCount = 0;

  for (const record of records) {
    try {
      await database.upsertTradingStatus(record);
      successCount++;
    } catch (err) {
      errorCount++;
      if (errorCount < 10) {
        logger.warn(`Failed to insert status for ${record.Symbol}`, { error: err });
      }
    }
  }

  logger.info('='.repeat(60));
  logger.info('Trading Status Loading Complete!');
  logger.info(`Total records: ${records.length}`);
  logger.info(`Successfully inserted: ${successCount}`);
  logger.info(`Errors: ${errorCount}`);
  logger.info('='.repeat(60));
}

async function main() {
  logger.info('='.repeat(60));
  logger.info('MSE Data Loading Script');
  logger.info('='.repeat(60));

  try {
    // Connect to services
    logger.info('Connecting to PostgreSQL...');
    await database.connect();
    
    logger.info('Connecting to Kafka...');
    await kafkaProducer.connect();

    // Load trading history (big file)
    await loadTradingHistory();

    // Load trading status (smaller file)
    await loadTradingStatus();

    logger.info('\n🎉 All data loaded successfully!');
    logger.info('\nNext steps:');
    logger.info('1. Check PostgreSQL: docker exec -it thesis-postgres psql -U thesis_user -d thesis_db');
    logger.info('2. Run: SELECT COUNT(*) FROM mse_trading_history;');
    logger.info('3. Check Kafka UI: http://localhost:8080');
    logger.info('4. View messages in mse-stock-updates topic');

  } catch (error) {
    logger.error('Fatal error', { error });
    process.exit(1);
  } finally {
    // Disconnect
    await kafkaProducer.disconnect();
    await database.disconnect();
  }
}

// Run the script
main();
