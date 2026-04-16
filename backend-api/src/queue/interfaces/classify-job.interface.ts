export interface ClassifyJobData {
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
