import type { SearchProduct } from './sentiment-job.interface';

export interface ScraperJobData {
  sentimentId: string;
  query: string;
  product: SearchProduct;
  limit: number;
}
