import type { ScrapedTweet } from '../../scraper/scraper.service';
import type { SentimentResult } from './sentiment-job.interface';

export type PipelineStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface PipelineState {
  status: PipelineStatus;
  query?: string;
  tweets?: ScrapedTweet[];
  result?: SentimentResult;
  errorMessage?: string;
}
