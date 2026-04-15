export interface CreateSentimentDto {
  query: string;
  product?: 'Top' | 'Latest';
  limit?: number;
}