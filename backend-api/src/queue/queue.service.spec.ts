import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { QueueService } from './queue.service';
import { QUEUE_NAMES } from './queue.constants';

jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
  };
  return jest.fn(() => mockRedis);
});

describe('QueueService', () => {
  let service: QueueService;
  let mockQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn(),
    } as unknown as jest.Mocked<Queue>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken(QUEUE_NAMES.SENTIMENT),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enqueue', () => {
    it('should add job to sentiment queue', async () => {
      const mockJob = { id: 'job-1', data: { query: 'AI' } };
      mockQueue.add.mockResolvedValue(mockJob as any);

      const result = await service.enqueue(QUEUE_NAMES.SENTIMENT, {
        query: 'AI',
        limit: 10,
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        QUEUE_NAMES.SENTIMENT,
        { query: 'AI', limit: 10 },
        expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
      expect(result).toEqual(mockJob);
    });

    it('should throw for unknown queue', async () => {
      await expect(
        service.enqueue('unknown-queue' as any, { data: 'test' }),
      ).rejects.toThrow('Unknown queue: unknown-queue');
    });
  });
});
