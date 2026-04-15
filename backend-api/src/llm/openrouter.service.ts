import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ScrapedTweet } from '../scraper/scraper.service';

export interface TweetSentiment {
  tweetId: string;
  text: string;
  username: string;
  views: number;
  likes: number;
  retweets: number;
  replies: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number; 
  influenceScore: number;
}

export interface SentimentResult {
  query: string;
  total: number;
  summary: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topInfluential: {
    tweetId: string;
    text: string;
    username: string;
    influenceScore: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  }[];
  tweets: TweetSentiment[];
  completedAt: string;
}

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('OPEN_ROUTER_API_KEY') ?? '';
    this.baseUrl =
      this.config.get<string>('OPENROUTER_BASE_URL') ??
      'https://openrouter.ai/api/v1';
    this.model =
      this.config.get<string>('OPEN_ROUTER_MODEL') ??
      'google/gemma-3-4b-it:free';
    if (!this.apiKey) throw new Error('OPEN_ROUTER_API_KEY not configured');
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries = 3,
    delayMs = 2000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (retries <= 0) throw err;
      const msg = String(err);
      const isOverloaded =
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('overloaded') ||
        msg.includes('rate_limit');
      if (isOverloaded) {
        this.logger.warn(
          `OpenRouter overloaded, retrying in ${delayMs}ms... (${retries} left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.retryWithBackoff(fn, retries - 1, delayMs * 2);
      }
      throw err;
    }
  }

  async analyzeTweets(tweets: ScrapedTweet[]): Promise<SentimentResult> {
    const tweetTexts = tweets
      .map((t, i) => `${i + 1}. [@${t.username}] ${t.text}`)
      .join('\n');

    const prompt = `Classify the sentiment of each tweet as positive, negative, or neutral.
Return a JSON array with exactly ${tweets.length} entries, each with:
- "index": number (1 to ${tweets.length})
- "sentiment": "positive" | "negative" | "neutral"
- "sentimentScore": number (-1 to 1, where -1=very negative, 1=very positive)

Tweet list:
${tweetTexts}

Respond ONLY with the JSON array, no extra text.`;

    const { data } = await this.retryWithBackoff(() =>
      axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2048,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000,
        },
      ),
    );

    const raw = data.choices?.[0]?.message?.content ?? '';
    let classifications: {
      index: number;
      sentiment: string;
      sentimentScore: number;
    }[] = [];
    try {
      let jsonStr = raw.trim();
      if (raw.startsWith('```')) {
        const firstNewline = raw.indexOf('\n');
        const lastBacktick = raw.lastIndexOf('```');
        jsonStr = raw.slice(firstNewline + 1, lastBacktick);
      }
      const parsed = JSON.parse(jsonStr);
      classifications = Array.isArray(parsed) ? parsed : [];
    } catch {
      classifications = tweets.map((_, i) => ({
        index: i + 1,
        sentiment: 'neutral',
        sentimentScore: 0,
      }));
    }

    const sentimentMap = new Map<
      number,
      { sentiment: string; sentimentScore: number }
    >(classifications.map((c) => [c.index, c]));

    const analyzed: TweetSentiment[] = tweets.map((tweet, idx) => {
      const cls = sentimentMap.get(idx + 1) ?? {
        sentiment: 'neutral',
        sentimentScore: 0,
      };
      const influenceScore =
        tweet.views +
        tweet.likes * 10 +
        tweet.retweets * 20 +
        tweet.replies * 15;
      return {
        tweetId: tweet.id,
        text: tweet.text,
        username: tweet.username,
        views: tweet.views,
        likes: tweet.likes,
        retweets: tweet.retweets,
        replies: tweet.replies,
        sentiment: cls.sentiment as 'positive' | 'negative' | 'neutral',
        sentimentScore: cls.sentimentScore,
        influenceScore,
      };
    });

    const total = analyzed.length;
    const positive = Math.round(
      (analyzed.filter((t) => t.sentiment === 'positive').length / total) * 100,
    );
    const negative = Math.round(
      (analyzed.filter((t) => t.sentiment === 'negative').length / total) * 100,
    );
    const neutral = 100 - positive - negative;

    const topInfluential = [...analyzed]
      .sort((a, b) => b.influenceScore - a.influenceScore)
      .slice(0, 10)
      .map((t) => ({
        tweetId: t.tweetId,
        text: t.text,
        username: t.username,
        influenceScore: t.influenceScore,
        sentiment: t.sentiment,
      }));

    return {
      query: tweets[0] ? '[scraped_query]' : '',
      total,
      summary: { positive, negative, neutral },
      topInfluential,
      tweets: analyzed,
      completedAt: new Date().toISOString(),
    };
  }
}
