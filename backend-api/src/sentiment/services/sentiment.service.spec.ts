import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { JobRequestFailedError } from '../../common/errors/job-request-failed.error';
import { JobRequestTimeoutError } from '../../common/errors/job-request-timeout.error';
import { GeminiService } from '../../llm/gemini.service';
import { JOB_TIMEOUT_MS, QUEUE_NAMES } from '../../queue/queue.constants';
import type {
  SentimentJobData,
  SentimentResult,
} from '../../queue/interfaces/sentiment-job.interface';
import { QueueService } from '../../queue/queue.service';
import { ScraperService } from '../../scraper/scraper.service';
import { SentimentRepository } from '../repositories/sentiment.repository';
import { SentimentService } from './sentiment.service';

describe('SentimentService', () => {
  let service: SentimentService;
  let queueService: jest.Mocked<
    Pick<QueueService, 'enqueueAndWait' | 'storeResult'>
  >;
  let scraperService: jest.Mocked<Pick<ScraperService, 'fetchTweets'>>;
  let geminiService: jest.Mocked<Pick<GeminiService, 'analyzeTweets'>>;
  let repository: jest.Mocked<
    Pick<
      SentimentRepository,
      'createQueuedJob' | 'markProcessing' | 'markCompleted' | 'markFailed'
    >
  >;

  beforeEach(async () => {
    queueService = {
      enqueueAndWait: jest.fn(),
      storeResult: jest.fn(),
    };
    scraperService = {
      fetchTweets: jest.fn(),
    };
    geminiService = {
      analyzeTweets: jest.fn(),
    };
    repository = {
      createQueuedJob: jest.fn(),
      markProcessing: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentimentService,
        { provide: QueueService, useValue: queueService },
        { provide: ScraperService, useValue: scraperService },
        { provide: GeminiService, useValue: geminiService },
        { provide: SentimentRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<SentimentService>(SentimentService);
  });

  it('should persist and enqueue sentiment requests', async () => {
    const result: SentimentResult = {
      query: 'AI',
      total: 1,
      summary: { positive: 100, negative: 0, neutral: 0 },
      topInfluential: [],
      tweets: [],
      completedAt: '2026-04-15T00:00:00.000Z',
    };
    queueService.enqueueAndWait.mockResolvedValue(result);

    const response = await service.requestSentiment({ query: 'AI', limit: 10 });

    expect(repository.createQueuedJob).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'AI', product: 'Top', limit: 10 }),
    );
    expect(queueService.enqueueAndWait).toHaveBeenCalledWith(
      QUEUE_NAMES.SENTIMENT,
      expect.objectContaining({ query: 'AI', product: 'Top', limit: 10 }),
      JOB_TIMEOUT_MS,
    );
    expect(response.result).toEqual(result);
  });

  it('should translate timeout errors', async () => {
    queueService.enqueueAndWait.mockRejectedValue(
      new Error(`Job sentiment_1 processing timeout after ${JOB_TIMEOUT_MS}ms`),
    );

    await expect(
      service.requestSentiment({ query: 'AI' }),
    ).rejects.toBeInstanceOf(JobRequestTimeoutError);
  });

  it('should translate generic queue errors', async () => {
    queueService.enqueueAndWait.mockRejectedValue(
      new Error('Redis unavailable'),
    );

    await expect(
      service.requestSentiment({ query: 'AI' }),
    ).rejects.toBeInstanceOf(JobRequestFailedError);
  });

  it('should process completed jobs and persist results', async () => {
    const job = {
      data: { jobId: 'sentiment_1', query: 'AI', product: 'Top', limit: 20 },
      attemptsMade: 0,
    } as Job<SentimentJobData>;
    const analyzed: SentimentResult = {
      query: '',
      total: 1,
      summary: { positive: 100, negative: 0, neutral: 0 },
      topInfluential: [],
      tweets: [],
      completedAt: '2026-04-15T00:00:00.000Z',
    };
    scraperService.fetchTweets.mockResolvedValue({
      query: 'ignored',
      product: 'Top',
      count: 1,
      tweets: [],
    });
    geminiService.analyzeTweets.mockResolvedValue(analyzed);

    await service.processJob(job);

    expect(repository.markProcessing).toHaveBeenCalledWith('sentiment_1', 1);
    expect(repository.markCompleted).toHaveBeenCalledWith(
      'sentiment_1',
      expect.objectContaining({ query: 'AI', total: 1 }),
      1,
    );
    expect(queueService.storeResult).toHaveBeenCalledWith(
      QUEUE_NAMES.SENTIMENT,
      'sentiment_1',
      expect.objectContaining({ query: 'AI' }),
    );
  });

  it('should persist failed jobs', async () => {
    const job = {
      data: { jobId: 'sentiment_1', query: 'AI', product: 'Top', limit: 20 },
      attemptsMade: 1,
    } as Job<SentimentJobData>;

    await service.failJob(job, new Error('Gemini unavailable'));

    expect(repository.markFailed).toHaveBeenCalledWith(
      'sentiment_1',
      'Gemini unavailable',
      2,
    );
  });
});
