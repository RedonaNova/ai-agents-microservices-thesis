import axios, { AxiosInstance } from 'axios';
import logger from './logger';
import { MSETradingHistory, MSETradingStatus, MSECompany } from './types';

class MSEApiClient {
  private client: AxiosInstance;
  private apiUrl: string;
  private apiKey?: string;

  constructor() {
    this.apiUrl = process.env.MSE_API_URL || '';
    this.apiKey = process.env.MSE_API_KEY;

    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      }
    });

    this.client.interceptors.response.use(
      response => response,
      error => {
        logger.error('MSE API request failed', { 
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });
        throw error;
      }
    );
  }

  /**
   * Fetch trading history for a specific date or date range
   */
  async fetchTradingHistory(date?: string): Promise<MSETradingHistory[]> {
    try {
      if (!this.apiUrl) {
        logger.warn('MSE_API_URL not configured. Cannot fetch from API.');
        return [];
      }

      const endpoint = date 
        ? `/trading-history?date=${date}`
        : '/trading-history';

      const response = await this.client.get<MSETradingHistory[]>(endpoint);
      
      logger.info(`Fetched ${response.data.length} trading records from MSE API`, { date });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch trading history', { error });
      return [];
    }
  }

  /**
   * Fetch current trading status (real-time)
   */
  async fetchTradingStatus(): Promise<MSETradingStatus[]> {
    try {
      if (!this.apiUrl) {
        logger.warn('MSE_API_URL not configured. Cannot fetch from API.');
        return [];
      }

      const response = await this.client.get<MSETradingStatus[]>('/trading-status');
      
      logger.info(`Fetched ${response.data.length} real-time trading status from MSE API`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch trading status', { error });
      return [];
    }
  }

  /**
   * Fetch company information
   */
  async fetchCompanies(): Promise<MSECompany[]> {
    try {
      if (!this.apiUrl) {
        logger.warn('MSE_API_URL not configured. Cannot fetch from API.');
        return [];
      }

      const response = await this.client.get<MSECompany[]>('/companies');
      
      logger.info(`Fetched ${response.data.length} companies from MSE API`);
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch companies', { error });
      return [];
    }
  }

  /**
   * Parse trading history from JSON array
   * Use this if you have data in a JSON file
   */
  parseFromArray(data: any[]): MSETradingHistory[] {
    return data.map(item => ({
      id: item.id,
      Symbol: item.Symbol,
      Name: item.Name,
      OpeningPrice: parseFloat(item.OpeningPrice) || 0,
      ClosingPrice: parseFloat(item.ClosingPrice) || 0,
      HighPrice: parseFloat(item.HighPrice) || 0,
      LowPrice: parseFloat(item.LowPrice) || 0,
      Volume: parseInt(item.Volume) || 0,
      PreviousClose: parseFloat(item.PreviousClose) || 0,
      Turnover: parseInt(item.Turnover) || 0,
      MDEntryTime: item.MDEntryTime,
      companycode: item.companycode,
      MarketSegmentID: item.MarketSegmentID,
      securityType: item.securityType,
      dates: item.dates
    }));
  }

  /**
   * Check if API is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiUrl) {
      return false;
    }

    try {
      await this.client.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

export default new MSEApiClient();

