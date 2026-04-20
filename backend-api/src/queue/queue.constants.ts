export const QUEUE_NAMES = {
  SEARCH: 'search',
  SENTIMENT: 'sentiment-analysis',
  SCRAPE: 'scrape',
  CLASSIFY: 'classify',
} as const;

export const JOB_TIMEOUT_MS = 300000;
export const JOB_RESULT_TTL_SECONDS = 86400;
export const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,
};

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
