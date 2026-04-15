import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ScrapedTweet {
  id: string;
  text: string;
  username: string;
  name: string;
  timestamp: number;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  permanentUrl: string;
}

export interface ScrapedResult {
  query: string;
  product: string;
  count: number;
  tweets: ScrapedTweet[];
}

@Injectable()
export class ScraperService {
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    this.baseUrl = this.config.get<string>(
      'SCRAPER_BASE_URL',
      'http://localhost:3001',
    );
  }

  async fetchTweets(
    query: string,
    product: 'Top' | 'Latest',
    limit: number,
  ): Promise<ScrapedResult> {
    const url = `${this.baseUrl}/api/search?q=${encodeURIComponent(query)}&product=${product}&limit=${limit}`;
    const { data } = await axios.get<ScrapedResult>(url, { timeout: 30000 });
    return data;
  }
}
