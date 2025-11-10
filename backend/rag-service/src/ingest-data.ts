/**
 * Data Ingestion Script
 * Loads MSE company data from PostgreSQL and indexes it in Qdrant
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import logger from './logger';
import database from './database';
import qdrantClient from './qdrant-client';
import embeddingService from './embedding-service';

async function ingestData() {
  try {
    logger.info('========================================');
    logger.info('Starting MSE Data Ingestion');
    logger.info('========================================');

    // Connect to database
    logger.info('Connecting to PostgreSQL...');
    await database.connect();

    // Initialize Qdrant
    logger.info('Initializing Qdrant...');
    await qdrantClient.initialize();

    // Fetch all companies
    logger.info('Fetching companies from database...');
    const companies = await database.getAllCompanies();
    logger.info(`Found ${companies.length} companies`);

    if (companies.length === 0) {
      logger.warn('No companies found in database');
      return;
    }

    // Generate embeddings
    logger.info('Generating embeddings...');
    logger.info('This may take a while due to rate limiting (1 req/sec)...');
    const companiesWithEmbeddings = await embeddingService.generateCompanyEmbeddings(companies);
    logger.info(`Generated ${companiesWithEmbeddings.length} embeddings`);

    // Prepare documents for Qdrant
    const documents = companiesWithEmbeddings.map((item, index) => ({
      id: index + 1, // Use integer index as ID (Qdrant requirement)
      vector: item.embedding,
      payload: {
        symbol: item.company.symbol,
        name: item.company.name,
        sector: item.company.sector,
        closingPrice: item.company.closingPrice,
        change: item.company.change,
        changePercent: item.company.changePercent,
        volume: item.company.volume,
        tradingDate: item.company.tradingDate,
      },
    }));

    // Upsert documents into Qdrant
    logger.info('Indexing documents in Qdrant...');
    await qdrantClient.upsertDocuments(documents);

    logger.info('========================================');
    logger.info('✅ Data ingestion completed successfully!');
    logger.info('========================================');
    logger.info(`Total companies indexed: ${documents.length}`);
    logger.info('RAG system is ready to use');

    process.exit(0);
  } catch (error) {
    logger.error('Data ingestion failed', { error });
    process.exit(1);
  }
}

// Run ingestion
ingestData();

