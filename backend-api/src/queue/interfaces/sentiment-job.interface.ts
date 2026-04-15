export interface SentimentJobData {
  jobId: string;
  query: string;
  product: 'Top' | 'Latest';
  limit: number;
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
  tweets: {
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
  }[];
  completedAt: string;
}
