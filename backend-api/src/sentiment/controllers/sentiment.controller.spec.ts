import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JobRequestFailedError } from '../../common/errors/job-request-failed.error';
import { JobRequestTimeoutError } from '../../common/errors/job-request-timeout.error';
import { PrismaService } from '../../prisma/prisma.service';
import { SentimentController } from './sentiment.controller';
import { SentimentService } from '../services/sentiment.service';

describe('SentimentController', () => {
  let controller: SentimentController;
  let sentimentService: jest.Mocked<
    Pick<SentimentService, 'requestSentiment' | 'getHistory'>
  >;
  let prismaService: {
    user: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'test@example.com',
          roleId: 2,
        }),
      },
    };

    sentimentService = {
      requestSentiment: jest.fn(),
      getHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SentimentController],
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        { provide: SentimentService, useValue: sentimentService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    controller = module.get<SentimentController>(SentimentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should handle POST requests through service', async () => {
    sentimentService.requestSentiment.mockResolvedValue({
      jobId: 'sentiment_job',
      status: 'completed',
      createdAt: '2026-04-15T00:00:00.000Z',
      result: {
        query: 'AI',
        total: 1,
        summary: { positive: 100, negative: 0, neutral: 0 },
        topInfluential: [],
        tweets: [],
        completedAt: '2026-04-15T00:00:00.000Z',
      },
    });

    const response = await controller.analyze(
      'test@example.com',
      { query: 'AI', limit: 10 },
    );

    expect(sentimentService.requestSentiment).toHaveBeenCalledWith(
      { query: 'AI', product: 'Top', limit: 10 },
      'user-1',
    );
    expect(response).toMatchObject({
      success: true,
      message: 'Sentiment analysis completed',
    });
  });

  it('should handle GET requests through service', async () => {
    sentimentService.requestSentiment.mockResolvedValue({
      jobId: 'sentiment_job',
      status: 'completed',
      createdAt: '2026-04-15T00:00:00.000Z',
      result: {
        query: 'pak purbaya',
        total: 2,
        summary: { positive: 50, negative: 25, neutral: 25 },
        topInfluential: [],
        tweets: [],
        completedAt: '2026-04-15T00:00:00.000Z',
      },
    });

    await controller.analyzeFromQuery(
      'test@example.com',
      'pak purbaya',
      undefined,
      'Latest',
      '20',
    );

    expect(sentimentService.requestSentiment).toHaveBeenCalledWith(
      { query: 'pak purbaya', product: 'Latest', limit: 20 },
      'user-1',
    );
  });

  it('should throw 504 on timeout errors', async () => {
    sentimentService.requestSentiment.mockRejectedValue(
      new JobRequestTimeoutError('job-1', 'timeout'),
    );

    await expect(
      controller.analyze('test@example.com', { query: 'AI' }),
    ).rejects.toThrow(HttpException);
  });

  it('should throw 500 on job failures', async () => {
    sentimentService.requestSentiment.mockRejectedValue(
      new JobRequestFailedError('job-2', 'Redis unavailable'),
    );

    await expect(
      controller.analyze('test@example.com', { query: 'AI' }),
    ).rejects.toThrow(HttpException);
  });

  it('should reject blank queries', async () => {
    await expect(
      controller.analyze('test@example.com', { query: '   ' }),
    ).rejects.toThrow('query is required');
  });

  it('should retrieve history for user', async () => {
    const mockHistory = [{ jobId: 'job-1', query: 'AI' }] as const;
    sentimentService.getHistory.mockResolvedValue(mockHistory as never);

    const response = await controller.getHistory('test@example.com');

    expect(sentimentService.getHistory).toHaveBeenCalledWith('user-1', false);
    expect(response).toMatchObject({
      success: true,
      message: 'History retrieved',
      data: mockHistory,
    });
  });

  it('should return 404 for unknown user', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);

    await expect(
      controller.getHistory('unknown@example.com'),
    ).rejects.toThrow('User not found');
  });
});
