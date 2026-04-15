import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueService } from './queue.service';
import { JOB_OPTIONS, QUEUE_NAMES } from './queue.constants';

const redisMock = {
  get: jest.fn(),
  setex: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn(() => redisMock);
});

describe('QueueService', () => {
  let service: QueueService;
  let searchQueue: jest.Mocked<Pick<Queue, 'add'>>;
  let sentimentQueue: jest.Mocked<Pick<Queue, 'add'>>;

  beforeEach(async () => {
    redisMock.get.mockReset();
    redisMock.setex.mockReset();

    searchQueue = { add: jest.fn() };
    sentimentQueue = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken(QUEUE_NAMES.SEARCH),
          useValue: searchQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.SENTIMENT),
          useValue: sentimentQueue,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should enqueue search jobs with configured options', async () => {
    searchQueue.add.mockResolvedValue({ id: 'job-1' } as Queue['add'] extends (
      ...args: never[]
    ) => Promise<infer TResult>
      ? TResult
      : never);

    await service.enqueue(QUEUE_NAMES.SEARCH, {
      jobId: 'search_1',
      query: 'AI',
      product: 'Top',
      limit: 20,
    });

    expect(searchQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.SEARCH,
      expect.objectContaining({ query: 'AI', limit: 20 }),
      expect.objectContaining({
        ...JOB_OPTIONS,
        jobId: 'search_1',
      }),
    );
  });

  it('should enqueue sentiment jobs with configured options', async () => {
    sentimentQueue.add.mockResolvedValue({
      id: 'job-2',
    } as Queue['add'] extends (...args: never[]) => Promise<infer TResult>
      ? TResult
      : never);

    await service.enqueue(QUEUE_NAMES.SENTIMENT, {
      jobId: 'sentiment_1',
      query: 'AI',
      product: 'Top',
      limit: 20,
    });

    expect(sentimentQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.SENTIMENT,
      expect.objectContaining({ query: 'AI', limit: 20 }),
      expect.objectContaining({
        ...JOB_OPTIONS,
        jobId: 'sentiment_1',
      }),
    );
  });

  it('should store results using queue-specific keys', async () => {
    redisMock.setex.mockResolvedValue('OK');

    await service.storeResult(QUEUE_NAMES.SEARCH, 'search_1', { ok: true });

    expect(redisMock.setex).toHaveBeenCalledWith(
      'search:result:search_1',
      86400,
      JSON.stringify({ ok: true }),
    );
  });
});
