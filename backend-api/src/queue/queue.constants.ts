export const QUEUE_NAMES = {
  SENTIMENT: 'sentiment-analysis',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
