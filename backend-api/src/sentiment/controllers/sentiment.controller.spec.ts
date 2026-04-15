import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { JobRequestFailedError } from '../../common/errors/job-request-failed.error';
import { JobRequestTimeoutError } from '../../common/errors/job-request-timeout.error';
import { SentimentController } from './sentiment.controller';
import { SentimentService } from '../services/sentiment.service';

describe('SentimentController', () => {
  let controller: SentimentController;
  let sentimentService: jest.Mocked<Pick<SentimentService, 'requestSentiment'>>;

  beforeEach(async () => {
    sentimentService = {
      requestSentiment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SentimentController],
      providers: [
        {
          provide: SentimentService,
          useValue: sentimentService,
        },
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

    const response = await controller.analyze({ query: 'AI', limit: 10 });

    expect(sentimentService.requestSentiment).toHaveBeenCalledWith({
      query: 'AI',
      product: 'Top',
      limit: 10,
    });
    expect(response.status).toBe('completed');
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

    await controller.analyzeFromQuery('pak purbaya', undefined, 'Latest', '20');

    expect(sentimentService.requestSentiment).toHaveBeenCalledWith({
      query: 'pak purbaya',
      product: 'Latest',
      limit: 20,
    });
  });

  it('should throw 504 on timeout errors', async () => {
    sentimentService.requestSentiment.mockRejectedValue(
      new JobRequestTimeoutError('job-1'),
    );

    await expect(controller.analyze({ query: 'AI' })).rejects.toThrow(
      HttpException,
    );
  });

  it('should throw 500 on job failures', async () => {
    sentimentService.requestSentiment.mockRejectedValue(
      new JobRequestFailedError('job-2', 'Redis unavailable'),
    );

    await expect(controller.analyze({ query: 'AI' })).rejects.toThrow(
      HttpException,
    );
  });

  it('should reject blank queries', async () => {
    await expect(controller.analyze({ query: '   ' })).rejects.toThrow(
      'query is required',
    );
  });
});
