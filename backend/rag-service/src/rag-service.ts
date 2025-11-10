import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import qdrantClient from './qdrant-client';
import embeddingService from './embedding-service';
import { RAGQuery, RAGResponse, CompanyDocument } from './types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

class RAGService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Query the RAG system and generate an answer in Mongolian
   */
  async query(ragQuery: RAGQuery): Promise<RAGResponse> {
    try {
      logger.info('Processing RAG query', {
        requestId: ragQuery.requestId,
        query: ragQuery.query,
        language: ragQuery.language,
      });

      // Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(ragQuery.query);

      // Search for relevant companies
      const topK = ragQuery.topK || 5;
      const searchResults = await qdrantClient.search(queryEmbedding, topK);

      // Extract company documents from search results
      const sources: CompanyDocument[] = searchResults.map((result: any) => ({
        symbol: result.payload.symbol,
        name: result.payload.name,
        sector: result.payload.sector,
        closingPrice: result.payload.closingPrice,
        change: result.payload.change,
        changePercent: result.payload.changePercent,
        volume: result.payload.volume,
        tradingDate: result.payload.tradingDate,
      }));

      logger.info('Found relevant companies', {
        count: sources.length,
        symbols: sources.map((s) => s.symbol),
      });

      // If no sources found
      if (sources.length === 0) {
        return {
          requestId: ragQuery.requestId,
          answer: ragQuery.language === 'mongolian'
            ? 'Уучлаарай, таны асуултанд хариулах мэдээлэл олдсонгүй. Өөр асуулт асуухыг хичээнэ үү.'
            : 'Sorry, I could not find relevant information for your query. Please try a different question.',
          sources: [],
          confidence: 0,
          language: ragQuery.language,
        };
      }

      // Build context from sources
      const context = this.buildContext(sources, ragQuery.language);

      // Generate answer using Gemini
      const answer = await this.generateAnswer(ragQuery.query, context, ragQuery.language);

      // Calculate average confidence score
      const confidence =
        searchResults.reduce((sum: number, r: any) => sum + r.score, 0) / searchResults.length;

      return {
        requestId: ragQuery.requestId,
        answer,
        sources,
        confidence,
        language: ragQuery.language,
      };
    } catch (error) {
      logger.error('RAG query failed', { error, requestId: ragQuery.requestId });
      throw error;
    }
  }

  /**
   * Build context string from company documents
   */
  private buildContext(companies: CompanyDocument[], language: 'mongolian' | 'english'): string {
    if (language === 'mongolian') {
      return companies
        .map((company, index) => {
          const parts = [
            `${index + 1}. ${company.name} (${company.symbol})`,
          ];

          if (company.sector) {
            parts.push(`   Салбар: ${company.sector}`);
          }

          if (company.closingPrice) {
            parts.push(`   Хаалтын үнэ: ${company.closingPrice.toFixed(2)} MNT`);
          }

          if (company.change !== undefined && company.changePercent !== undefined) {
            const direction = company.change >= 0 ? '↑' : '↓';
            parts.push(
              `   Өөрчлөлт: ${direction} ${Math.abs(company.change).toFixed(2)} MNT (${company.changePercent.toFixed(2)}%)`
            );
          }

          if (company.volume) {
            parts.push(`   Арилжаа: ${company.volume.toLocaleString()} ширхэг`);
          }

          if (company.tradingDate) {
            parts.push(`   Огноо: ${company.tradingDate}`);
          }

          return parts.join('\n');
        })
        .join('\n\n');
    } else {
      return companies
        .map((company, index) => {
          const parts = [
            `${index + 1}. ${company.name} (${company.symbol})`,
          ];

          if (company.sector) {
            parts.push(`   Sector: ${company.sector}`);
          }

          if (company.closingPrice) {
            parts.push(`   Closing Price: ${company.closingPrice.toFixed(2)} MNT`);
          }

          if (company.change !== undefined && company.changePercent !== undefined) {
            const direction = company.change >= 0 ? '↑' : '↓';
            parts.push(
              `   Change: ${direction} ${Math.abs(company.change).toFixed(2)} MNT (${company.changePercent.toFixed(2)}%)`
            );
          }

          if (company.volume) {
            parts.push(`   Volume: ${company.volume.toLocaleString()} shares`);
          }

          if (company.tradingDate) {
            parts.push(`   Date: ${company.tradingDate}`);
          }

          return parts.join('\n');
        })
        .join('\n\n');
    }
  }

  /**
   * Generate answer using Gemini with context
   */
  private async generateAnswer(
    query: string,
    context: string,
    language: 'mongolian' | 'english'
  ): Promise<string> {
    try {
      const prompt = this.buildPrompt(query, context, language);
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      logger.error('Failed to generate answer', { error });
      throw error;
    }
  }

  /**
   * Build prompt for Gemini
   */
  private buildPrompt(query: string, context: string, language: 'mongolian' | 'english'): string {
    if (language === 'mongolian') {
      return `Та Монголын Хөрөнгийн Биржийн (MSE) талаарх мэдээлэл өгдөг туслах систем юм.

Хэрэглэгчийн асуулт: ${query}

Холбогдох компаниудын мэдээлэл:
${context}

Дараах журмыг дагаарай:
1. ЗӨВХӨН дээрх мэдээлэлд суурилан хариулна уу
2. Хариултаа МОНГОЛ хэл дээр бичнэ үү
3. Тодорхой, ойлгомжтой хариулт өгнө үү
4. Тоо, хувь өөрчлөлт зэргийг оруулж өгнө үү
5. Хэрэв мэдээлэл хангалтгүй бол тэр тухайгаа хэлнэ үү
6. Санхүүгийн зөвлөгөө өгч байгаа мэт бүү хар
7. Зүгээр л тухайн компанийн одоогийн байдлыг тайлбарлана уу

Хариулт:`;
    } else {
      return `You are a helpful assistant that provides information about the Mongolian Stock Exchange (MSE).

User Question: ${query}

Relevant Company Information:
${context}

Please follow these rules:
1. ONLY use the information provided above
2. Answer in ENGLISH
3. Be clear and concise
4. Include specific numbers and percentages
5. If information is insufficient, say so
6. Don't provide financial advice
7. Just describe the current state of the companies

Answer:`;
    }
  }
}

export default new RAGService();

