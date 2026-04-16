export interface ScraperJobData {
  sentimentId: string;
  query: string;
  product: 'Top' | 'Latest';
  limit: number;
}
