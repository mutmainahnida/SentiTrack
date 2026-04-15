import type { SearchProduct } from '../../queue/interfaces/sentiment-job.interface';

export interface CreateSentimentDto {
  query: string;
  product?: SearchProduct;
  limit?: number;
}
