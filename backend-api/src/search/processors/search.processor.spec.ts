import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { SearchProcessor } from './search.processor';
import { SearchService } from '../services/search.service';
import type { SearchJobData } from '../../queue/interfaces/search-job.interface';

describe('SearchProcessor', () => {
  let processor: SearchProcessor;
  let searchService: jest.Mocked<Pick<SearchService, 'processJob' | 'failJob'>>;

  beforeEach(async () => {
    searchService = {
      processJob: jest.fn(),
      failJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchProcessor,
        {
          provide: SearchService,
          useValue: searchService,
        },
      ],
    }).compile();

    processor = module.get<SearchProcessor>(SearchProcessor);
  });

  it('should delegate successful jobs to service', async () => {
    const job = {
      data: { jobId: 'search_123', query: 'AI', product: 'Top', limit: 10 },
      attemptsMade: 0,
    } as Job<SearchJobData>;

    await processor.process(job);

    expect(searchService.processJob).toHaveBeenCalledWith(job);
    expect(searchService.failJob).not.toHaveBeenCalled();
  });

  it('should mark jobs as failed when service throws', async () => {
    const job = {
      data: { jobId: 'search_123', query: 'AI', product: 'Top', limit: 10 },
      attemptsMade: 1,
    } as Job<SearchJobData>;
    const error = new Error('Scraper unavailable');
    searchService.processJob.mockRejectedValue(error);

    await expect(processor.process(job)).rejects.toThrow(error);

    expect(searchService.failJob).toHaveBeenCalledWith(job, error);
  });
});
