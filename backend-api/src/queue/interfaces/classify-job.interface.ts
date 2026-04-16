import type { ScrapedTweet } from '../../scraper/scraper.service';

export interface ClassifyJobData {
  sentimentId: string;
  query: string;
  tweets: ScrapedTweet[];
}
