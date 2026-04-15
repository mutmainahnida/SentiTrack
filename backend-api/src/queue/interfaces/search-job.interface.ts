import type {
  ScrapedResult,
  ScrapedTweet,
} from '../../scraper/scraper.service';
import type { SearchProduct } from './sentiment-job.interface';

export interface SearchJobData {
  jobId: string;
  query: string;
  product: SearchProduct;
  limit: number;
}

export interface SearchResult extends ScrapedResult {
  tweets: ScrapedTweet[];
  completedAt: string;
}
