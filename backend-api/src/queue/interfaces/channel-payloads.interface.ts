export interface ScrapeResultPayload {
  sentimentId: string;
  tweets: Array<{
    id: string;
    text: string;
    username: string;
    views: number;
    likes: number;
    retweets: number;
    replies: number;
  }>;
}

export interface ClassifyResultPayload {
  sentimentId: string;
  result: {
    summary: { positive: number; negative: number; neutral: number };
    topInfluential: Array<Record<string, unknown>>;
    tweets: Array<Record<string, unknown>>;
    completedAt: string;
  };
}

export interface PipelineErrorPayload {
  sentimentId: string;
  error: true;
  message: string;
  stage: 'scrape' | 'classify';
}
