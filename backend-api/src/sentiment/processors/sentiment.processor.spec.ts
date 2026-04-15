import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { SentimentProcessor } from './sentiment.processor';
import { SentimentService } from '../services/sentiment.service';
import type { SentimentJobData } from '../../queue/interfaces/sentiment-job.interface';

describe('SentimentProcessor', () => {
  let processor: SentimentProcessor;
  let sentimentService: jest.Mocked<
    Pick<SentimentService, 'processJob' | 'failJob'>
  >;

  beforeEach(async () => {
    sentimentService = {
      processJob: jest.fn(),
      failJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentimentProcessor,
        {
          provide: SentimentService,
          useValue: sentimentService,
        },
      ],
    }).compile();

    processor = module.get<SentimentProcessor>(SentimentProcessor);
  });

  it('should delegate successful jobs to service', async () => {
    const job = {
      data: { jobId: 'sentiment_123', query: 'AI', product: 'Top', limit: 10 },
      attemptsMade: 0,
    } as Job<SentimentJobData>;

    await processor.process(job);

    expect(sentimentService.processJob).toHaveBeenCalledWith(job);
    expect(sentimentService.failJob).not.toHaveBeenCalled();
  });

  it('should mark jobs as failed when service throws', async () => {
    const job = {
      data: { jobId: 'sentiment_123', query: 'AI', product: 'Top', limit: 10 },
      attemptsMade: 1,
    } as Job<SentimentJobData>;
    const error = new Error('OpenRouter unavailable');
    sentimentService.processJob.mockRejectedValue(error);

    await expect(processor.process(job)).rejects.toThrow(error);

    expect(sentimentService.failJob).toHaveBeenCalledWith(job, error);
  });
});
