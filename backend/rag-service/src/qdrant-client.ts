import { QdrantClient } from '@qdrant/js-client-rest';
import logger from './logger';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = 'mse_companies';
const VECTOR_SIZE = 768; // Gemini embedding dimension

class QdrantService {
  private client: QdrantClient;
  private collectionName: string;

  constructor() {
    this.client = new QdrantClient({ url: QDRANT_URL });
    this.collectionName = COLLECTION_NAME;
  }

  async initialize() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (col) => col.name === this.collectionName
      );

      if (!collectionExists) {
        logger.info('Creating Qdrant collection', { collection: this.collectionName });
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
          },
        });
        logger.info('Collection created successfully');
      } else {
        logger.info('Collection already exists', { collection: this.collectionName });
      }
    } catch (error) {
      logger.error('Failed to initialize Qdrant', { error });
      throw error;
    }
  }

  async upsertDocuments(documents: Array<{ id: string; vector: number[]; payload: any }>) {
    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: documents,
      });
      logger.info('Documents upserted', { count: documents.length });
    } catch (error) {
      logger.error('Failed to upsert documents', { error });
      throw error;
    }
  }

  async search(queryVector: number[], topK: number = 5, filter?: any) {
    try {
      const results = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit: topK,
        with_payload: true,
        filter,
      });
      return results;
    } catch (error) {
      logger.error('Failed to search', { error });
      throw error;
    }
  }

  async deleteCollection() {
    try {
      await this.client.deleteCollection(this.collectionName);
      logger.info('Collection deleted', { collection: this.collectionName });
    } catch (error) {
      logger.error('Failed to delete collection', { error });
    }
  }
}

export default new QdrantService();

