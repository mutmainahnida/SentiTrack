import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { JobRequestFailedError } from '../../common/errors/job-request-failed.error';
import { JobRequestTimeoutError } from '../../common/errors/job-request-timeout.error';
import { SearchController } from './search.controller';
import { SearchService } from '../services/search.service';

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: jest.Mocked<Pick<SearchService, 'requestSearch'>>;

  beforeEach(async () => {
    searchService = {
      requestSearch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: searchService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should handle GET search requests through service', async () => {
    searchService.requestSearch.mockResolvedValue({
      jobId: 'search_job',
      status: 'completed',
      createdAt: '2026-04-15T00:00:00.000Z',
      result: {
        query: 'pak purbaya',
        product: 'Top',
        count: 1,
        tweets: [],
        completedAt: '2026-04-15T00:00:00.000Z',
      },
    });

    await controller.search('pak purbaya', undefined, 'Top', '20');

    expect(searchService.requestSearch).toHaveBeenCalledWith({
      query: 'pak purbaya',
      product: 'Top',
      limit: 20,
    });
  });

  it('should handle POST search requests through service', async () => {
    searchService.requestSearch.mockResolvedValue({
      jobId: 'search_job',
      status: 'completed',
      createdAt: '2026-04-15T00:00:00.000Z',
      result: {
        query: 'AI',
        product: 'Latest',
        count: 1,
        tweets: [],
        completedAt: '2026-04-15T00:00:00.000Z',
      },
    });

    await controller.create({ query: 'AI', product: 'Latest', limit: 5 });

    expect(searchService.requestSearch).toHaveBeenCalledWith({
      query: 'AI',
      product: 'Latest',
      limit: 5,
    });
  });

  it('should map timeout errors to HttpException', async () => {
    searchService.requestSearch.mockRejectedValue(
      new JobRequestTimeoutError('job-1'),
    );

    await expect(controller.create({ query: 'AI' })).rejects.toThrow(
      HttpException,
    );
  });

  it('should map failures to HttpException', async () => {
    searchService.requestSearch.mockRejectedValue(
      new JobRequestFailedError('job-2', 'Queue unavailable'),
    );

    await expect(controller.create({ query: 'AI' })).rejects.toThrow(
      HttpException,
    );
  });
});
