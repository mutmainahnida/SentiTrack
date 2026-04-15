export type SearchProduct = 'Top' | 'Latest';

export interface SentimentJobData {
  jobId: string;
  query: string;
  product: SearchProduct;
  limit: number;
}

export interface TweetSentimentData {
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
  topInfluential: TweetSentimentData[];
  tweets: TweetSentimentData[];
  completedAt: string;
}
