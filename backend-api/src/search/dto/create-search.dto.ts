import type { SearchProduct } from '../../queue/interfaces/sentiment-job.interface';

export interface CreateSearchDto {
  query: string;
  product?: SearchProduct;
  limit?: number;
}
