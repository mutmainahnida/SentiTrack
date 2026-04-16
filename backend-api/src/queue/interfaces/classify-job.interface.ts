import type { ScrapedTweet } from '../../scraper/scraper.service';

export interface ClassifyJobData {
  sentimentId: string;
  tweets: ScrapedTweet[];
}
