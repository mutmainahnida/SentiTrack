import { JobStatus } from '@prisma/client';
import type { SentimentResult } from '../../queue/interfaces/sentiment-job.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { SentimentRepository } from './sentiment.repository';

describe('SentimentRepository', () => {
  let repository: SentimentRepository;
  type SentimentCreateArgs = {
    data: {
      jobId: string;
      query: string;
      product: string;
      requestedLimit: number;
      status: JobStatus;
    };
  };
  type SentimentUpdateArgs = {
    where: { jobId: string };
    data: {
      status: JobStatus;
      attempts: number;
      total: number;
      positivePct: number;
    };
  };
  let prismaService: {
    sentimentJobHistory: {
      create: jest.Mock<Promise<unknown>, [SentimentCreateArgs]>;
      update: jest.Mock<Promise<unknown>, [SentimentUpdateArgs]>;
    };
  };

  beforeEach(() => {
    prismaService = {
      sentimentJobHistory: {
        create: jest.fn<Promise<unknown>, [SentimentCreateArgs]>(),
        update: jest.fn<Promise<unknown>, [SentimentUpdateArgs]>(),
      },
    };

    repository = new SentimentRepository(
      prismaService as unknown as PrismaService,
    );
  });

  it('should create queued jobs', async () => {
    await repository.createQueuedJob({
      userId: 'user-1',
      jobId: 'sentiment_1',
      query: 'AI',
      product: 'Top',
      limit: 20,
    });

    expect(prismaService.sentimentJobHistory.create).toHaveBeenCalledTimes(1);
    const createCall =
      prismaService.sentimentJobHistory.create.mock.calls.at(0)?.[0];

    expect(createCall).toBeDefined();

    expect(createCall?.data).toMatchObject({
      jobId: 'sentiment_1',
      query: 'AI',
      product: 'Top',
      requestedLimit: 20,
      status: JobStatus.QUEUED,
    });
  });

  it('should persist completed snapshots', async () => {
    const result: SentimentResult = {
      query: 'AI',
      total: 1,
      summary: { positive: 100, negative: 0, neutral: 0 },
      topInfluential: [
        {
          tweetId: '1',
          text: 'hello',
          username: 'user',
          views: 100,
          likes: 10,
          retweets: 5,
          replies: 1,
          sentiment: 'positive',
          sentimentScore: 0.9,
          influenceScore: 10,
        },
      ],
      tweets: [
        {
          tweetId: '1',
          text: 'hello',
          username: 'user',
          views: 100,
          likes: 10,
          retweets: 5,
          replies: 1,
          sentiment: 'positive',
          sentimentScore: 0.9,
          influenceScore: 50,
        },
      ],
      completedAt: '2026-04-15T00:00:00.000Z',
    };

    await repository.markCompleted('sentiment_1', result, 1);

    expect(prismaService.sentimentJobHistory.update).toHaveBeenCalledTimes(1);
    const updateCall =
      prismaService.sentimentJobHistory.update.mock.calls.at(0)?.[0];

    expect(updateCall).toBeDefined();

    expect(updateCall?.where).toEqual({ jobId: 'sentiment_1' });
    expect(updateCall?.data).toMatchObject({
      status: JobStatus.COMPLETED,
      attempts: 1,
      total: 1,
      positivePct: 100,
    });
  });
});
