import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ScrapedTweet } from '../scraper/scraper.service';

interface RawTweetClassification {
  index: number;
  sentiment: string;
  sentimentScore: number;
}

interface ClassificationCandidate {
  index?: unknown;
  sentiment?: unknown;
  sentimentScore?: unknown;
}

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
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    this.ai = new GoogleGenAI({ apiKey });
    this.model =
      this.config.get<string>('GEMINI_MODEL') ?? 'gemma-3-27b-it';
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

    this.logger.log(
      `Sending ${tweets.length} tweets to Gemini (model: ${this.model})`,
    );

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        maxOutputTokens: 4096,
        temperature: 0.1,
      },
    });

    const raw = response.text ?? '';
    let classifications: RawTweetClassification[] = [];

    try {
      let jsonStr = raw.trim();
      // Strip markdown code fences if present
      if (jsonStr.startsWith('```')) {
        const firstNewline = jsonStr.indexOf('\n');
        const lastBacktick = jsonStr.lastIndexOf('```');
        jsonStr = jsonStr.slice(firstNewline + 1, lastBacktick).trim();
      }
      const parsed: unknown = JSON.parse(jsonStr);
      classifications = this.isClassificationArray(parsed) ? parsed : [];
    } catch {
      this.logger.warn('Failed to parse Gemini JSON response, defaulting to neutral');
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

  private isClassificationArray(
    value: unknown,
  ): value is RawTweetClassification[] {
    return (
      Array.isArray(value) &&
      value.every((item) => this.isClassificationItem(item))
    );
  }

  private isClassificationItem(item: unknown): item is RawTweetClassification {
    if (typeof item !== 'object' || item === null) return false;
    const candidate = item as ClassificationCandidate;
    return (
      typeof candidate.index === 'number' &&
      typeof candidate.sentiment === 'string' &&
      typeof candidate.sentimentScore === 'number'
    );
  }
}
