import type { ScrapedTweet } from '../../scraper/scraper.service';
import type { SentimentResult } from './sentiment-job.interface';

export interface ScrapeResultPayload {
  sentimentId: string;
  tweets: ScrapedTweet[];
}

export interface ClassifyResultPayload {
  sentimentId: string;
  result: SentimentResult;
}

export interface PipelineErrorPayload {
  sentimentId: string;
  error: true;
  message: string;
  stage: 'scrape' | 'classify';
}
