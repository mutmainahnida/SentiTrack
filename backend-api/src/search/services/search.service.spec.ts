import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { JobRequestFailedError } from '../../common/errors/job-request-failed.error';
import { JobRequestTimeoutError } from '../../common/errors/job-request-timeout.error';
import { JOB_TIMEOUT_MS, QUEUE_NAMES } from '../../queue/queue.constants';
import type {
  SearchJobData,
  SearchResult,
} from '../../queue/interfaces/search-job.interface';
import { QueueService } from '../../queue/queue.service';
import { ScraperService } from '../../scraper/scraper.service';
import { SearchRepository } from '../repositories/search.repository';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let queueService: jest.Mocked<
    Pick<QueueService, 'enqueueAndWait' | 'storeResult'>
  >;
  let scraperService: jest.Mocked<Pick<ScraperService, 'fetchTweets'>>;
  let repository: jest.Mocked<
    Pick<
      SearchRepository,
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
    repository = {
      createQueuedJob: jest.fn(),
      markProcessing: jest.fn(),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: QueueService, useValue: queueService },
        { provide: ScraperService, useValue: scraperService },
        { provide: SearchRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should persist and enqueue search requests', async () => {
    const result: SearchResult = {
      query: 'AI',
      product: 'Top',
      count: 1,
      tweets: [],
      completedAt: '2026-04-15T00:00:00.000Z',
    };
    queueService.enqueueAndWait.mockResolvedValue(result);

    const response = await service.requestSearch({ query: 'AI', limit: 10 });

    expect(repository.createQueuedJob).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'AI', product: 'Top', limit: 10 }),
    );
    expect(queueService.enqueueAndWait).toHaveBeenCalledWith(
      QUEUE_NAMES.SEARCH,
      expect.objectContaining({ query: 'AI', product: 'Top', limit: 10 }),
      JOB_TIMEOUT_MS,
    );
    expect(response.result).toEqual(result);
  });

  it('should translate timeout errors', async () => {
    queueService.enqueueAndWait.mockRejectedValue(
      new Error(`Job search_1 processing timeout after ${JOB_TIMEOUT_MS}ms`),
    );

    await expect(service.requestSearch({ query: 'AI' })).rejects.toBeInstanceOf(
      JobRequestTimeoutError,
    );
  });

  it('should translate generic queue errors', async () => {
    queueService.enqueueAndWait.mockRejectedValue(
      new Error('Redis unavailable'),
    );

    await expect(service.requestSearch({ query: 'AI' })).rejects.toBeInstanceOf(
      JobRequestFailedError,
    );
  });

  it('should process completed jobs and persist results', async () => {
    const job = {
      data: { jobId: 'search_1', query: 'AI', product: 'Top', limit: 20 },
      attemptsMade: 0,
    } as Job<SearchJobData>;
    scraperService.fetchTweets.mockResolvedValue({
      query: 'ignored',
      product: 'Top',
      count: 1,
      tweets: [],
    });

    await service.processJob(job);

    expect(repository.markProcessing).toHaveBeenCalledWith('search_1', 1);
    expect(repository.markCompleted).toHaveBeenCalledWith(
      'search_1',
      expect.objectContaining({ query: 'AI', count: 1, product: 'Top' }),
      1,
    );
    expect(queueService.storeResult).toHaveBeenCalledWith(
      QUEUE_NAMES.SEARCH,
      'search_1',
      expect.objectContaining({ query: 'AI' }),
    );
  });

  it('should persist failed jobs', async () => {
    const job = {
      data: { jobId: 'search_1', query: 'AI', product: 'Top', limit: 20 },
      attemptsMade: 1,
    } as Job<SearchJobData>;

    await service.failJob(job, new Error('Scraper unavailable'));

    expect(repository.markFailed).toHaveBeenCalledWith(
      'search_1',
      'Scraper unavailable',
      2,
    );
  });
});
