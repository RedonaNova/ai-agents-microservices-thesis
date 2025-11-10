import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import { CompanyDocument } from './types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

class EmbeddingService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  /**
   * Generate embedding for text using Gemini embedding model
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      logger.error('Failed to generate embedding', { error });
      throw error;
    }
  }

  /**
   * Convert company document to text for embedding
   */
  companyToText(company: CompanyDocument): string {
    const parts = [
      `Компани: ${company.name}`,
      `Код: ${company.symbol}`,
    ];

    if (company.sector) {
      parts.push(`Салбар: ${company.sector}`);
    }

    if (company.closingPrice) {
      parts.push(`Хаалтын үнэ: ${company.closingPrice.toFixed(2)} MNT`);
    }

    if (company.change !== undefined) {
      const direction = company.change >= 0 ? 'өссөн' : 'буурсан';
      parts.push(`Өөрчлөлт: ${Math.abs(company.change).toFixed(2)} MNT ${direction}`);
    }

    if (company.changePercent !== undefined) {
      parts.push(`Хувийн өөрчлөлт: ${company.changePercent.toFixed(2)}%`);
    }

    if (company.volume) {
      parts.push(`Арилжааны хэмжээ: ${company.volume.toLocaleString()}`);
    }

    if (company.tradingDate) {
      parts.push(`Огноо: ${company.tradingDate}`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Generate embeddings for multiple companies
   */
  async generateCompanyEmbeddings(companies: CompanyDocument[]): Promise<
    Array<{ company: CompanyDocument; embedding: number[] }>
  > {
    const embeddings: Array<{ company: CompanyDocument; embedding: number[] }> = [];

    for (const company of companies) {
      try {
        const text = this.companyToText(company);
        const embedding = await this.generateEmbedding(text);
        embeddings.push({ company, embedding });
        logger.info('Generated embedding', { symbol: company.symbol });
        
        // Rate limiting: wait 1 second between requests
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error('Failed to generate embedding for company', {
          symbol: company.symbol,
          error,
        });
      }
    }

    return embeddings;
  }
}

export default new EmbeddingService();

