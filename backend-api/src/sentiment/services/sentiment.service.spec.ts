import { Test, TestingModule } from '@nestjs/testing';
import type { SentimentResult } from '../../queue/interfaces/sentiment-job.interface';
import { SentimentRepository } from '../repositories/sentiment.repository';
import { SentimentService } from './sentiment.service';
import { PipelineOrchestrator } from '../../queue/pipeline-orchestrator.service';

describe('SentimentService', () => {
  let service: SentimentService;
  let pipelineOrchestrator: jest.Mocked<PipelineOrchestrator>;
  let repository: jest.Mocked<
    Pick<SentimentRepository, 'createQueuedJob' | 'findHistory' | 'findByJobId'>
  >;

  beforeEach(async () => {
    pipelineOrchestrator = {
      startPipeline: jest.fn(),
    } as unknown as jest.Mocked<PipelineOrchestrator>;

    repository = {
      createQueuedJob: jest.fn(),
      findHistory: jest.fn(),
      findByJobId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentimentService,
        { provide: PipelineOrchestrator, useValue: pipelineOrchestrator },
        { provide: SentimentRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<SentimentService>(SentimentService);
  });

  it('should create queued job and start pipeline', async () => {
    const result: SentimentResult = {
      query: 'AI',
      total: 1,
      summary: { positive: 100, negative: 0, neutral: 0 },
      topInfluential: [],
      tweets: [],
      completedAt: '2026-04-15T00:00:00.000Z',
    };
    pipelineOrchestrator.startPipeline.mockResolvedValue(result);

    const response = await service.requestSentiment({ query: 'AI', limit: 10 }, 'user-1');

    expect(repository.createQueuedJob).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'AI', product: 'Top', limit: 10 }),
    );
    expect(pipelineOrchestrator.startPipeline).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'AI', product: 'Top', limit: 10 }),
    );
    expect(response).toMatchObject({
      status: 'completed',
      summary: { positive: 100, negative: 0, neutral: 0 },
    });
    expect(response.id).toMatch(/^sentiment_\d+_[a-f0-9]+$/);
  });

  it('should return history for user', async () => {
    const mockHistory = [{ jobId: 'job-1', query: 'AI' }] as const;
    repository.findHistory.mockResolvedValue(mockHistory as never);

    const result = await service.getHistory('user-1', false);

    expect(repository.findHistory).toHaveBeenCalledWith('user-1', false);
    expect(result).toEqual(mockHistory);
  });

  it('should look up job by id', async () => {
    const mockRecord = { jobId: 'sentiment_123', query: 'AI' } as const;
    repository.findByJobId.mockResolvedValue(mockRecord as never);

    const result = await service.getByJobId('sentiment_123');

    expect(repository.findByJobId).toHaveBeenCalledWith('sentiment_123');
    expect(result).toEqual(mockRecord);
  });
});