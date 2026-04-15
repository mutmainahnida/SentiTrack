import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { SentimentController } from './sentiment.controller';
import { QueueService } from '../../queue/queue.service';
import { QUEUE_NAMES } from '../../queue/queue.constants';

describe('SentimentController', () => {
  let controller: SentimentController;
  let mockQueueService: jest.Mocked<QueueService>;

  beforeEach(async () => {
    mockQueueService = {
      enqueueAndWait: jest.fn(),
    } as unknown as jest.Mocked<QueueService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SentimentController],
      providers: [{ provide: QueueService, useValue: mockQueueService }],
    }).compile();

    controller = module.get<SentimentController>(SentimentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('analyze', () => {
    it('should return completed result with jobId', async () => {
      const mockResult = {
        query: 'AI',
        total: 3,
        summary: { positive: 67, negative: 33, neutral: 0 },
        topInfluential: [],
        tweets: [],
        completedAt: '2026-04-15T00:00:00.000Z',
      };
      mockQueueService.enqueueAndWait.mockResolvedValue(mockResult);

      const response = await controller.analyze({ query: 'AI', limit: 3 });

      expect(response).toMatchObject({
        status: 'completed',
        result: mockResult,
      });
      expect((response as any).jobId).toMatch(/^sentiment_\d+$/);
      expect(mockQueueService.enqueueAndWait).toHaveBeenCalledWith(
        QUEUE_NAMES.SENTIMENT,
        expect.objectContaining({ query: 'AI', limit: 3, product: 'Top' }),
        120000,
      );
    });

    it('should default product to Top and limit to 100', async () => {
      mockQueueService.enqueueAndWait.mockResolvedValue({} as any);

      await controller.analyze({ query: 'AI' });

      expect(mockQueueService.enqueueAndWait).toHaveBeenCalledWith(
        QUEUE_NAMES.SENTIMENT,
        expect.objectContaining({ product: 'Top', limit: 100 }),
        120000,
      );
    });

    it('should throw 504 on timeout', async () => {
      mockQueueService.enqueueAndWait.mockRejectedValue(
        new Error('Job job_1 processing timeout after 120000ms'),
      );

      await expect(controller.analyze({ query: 'AI' })).rejects.toThrow(
        HttpException,
      );
      try {
        await controller.analyze({ query: 'AI' });
      } catch (err) {
        expect((err as HttpException).getStatus()).toBe(504);
        expect((err as any).response.jobId).toMatch(/^sentiment_\d+$/);
      }
    });

    it('should throw 500 on generic error', async () => {
      mockQueueService.enqueueAndWait.mockRejectedValue(
        new Error('Redis unavailable'),
      );

      await expect(controller.analyze({ query: 'AI' })).rejects.toThrow(
        HttpException,
      );
      try {
        await controller.analyze({ query: 'AI' });
      } catch (err) {
        expect((err as HttpException).getStatus()).toBe(500);
      }
    });
  });
});
