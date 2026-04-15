import { JobStatus } from '@prisma/client';
import type { SearchResult } from '../../queue/interfaces/search-job.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchRepository } from './search.repository';

describe('SearchRepository', () => {
  let repository: SearchRepository;
  type SearchCreateArgs = {
    data: {
      jobId: string;
      query: string;
      product: string;
      requestedLimit: number;
      status: JobStatus;
    };
  };
  type SearchUpdateArgs = {
    where: { jobId: string };
    data: {
      status: JobStatus;
      attempts: number;
      total: number;
    };
  };
  let prismaService: {
    searchJobHistory: {
      create: jest.Mock<Promise<unknown>, [SearchCreateArgs]>;
      update: jest.Mock<Promise<unknown>, [SearchUpdateArgs]>;
    };
  };

  beforeEach(() => {
    prismaService = {
      searchJobHistory: {
        create: jest.fn<Promise<unknown>, [SearchCreateArgs]>(),
        update: jest.fn<Promise<unknown>, [SearchUpdateArgs]>(),
      },
    };

    repository = new SearchRepository(
      prismaService as unknown as PrismaService,
    );
  });

  it('should create queued jobs', async () => {
    await repository.createQueuedJob({
      jobId: 'search_1',
      query: 'AI',
      product: 'Top',
      limit: 20,
    });

    expect(prismaService.searchJobHistory.create).toHaveBeenCalledTimes(1);
    const createCall =
      prismaService.searchJobHistory.create.mock.calls.at(0)?.[0];

    expect(createCall).toBeDefined();

    expect(createCall?.data).toMatchObject({
      jobId: 'search_1',
      query: 'AI',
      product: 'Top',
      requestedLimit: 20,
      status: JobStatus.QUEUED,
    });
  });

  it('should persist completed snapshots', async () => {
    const result: SearchResult = {
      query: 'AI',
      product: 'Top',
      count: 1,
      tweets: [
        {
          id: '1',
          text: 'hello',
          username: 'user',
          name: 'User',
          timestamp: 1,
          likes: 2,
          retweets: 3,
          replies: 4,
          views: 5,
          permanentUrl: 'https://x.com/status/1',
        },
      ],
      completedAt: '2026-04-15T00:00:00.000Z',
    };

    await repository.markCompleted('search_1', result, 1);

    expect(prismaService.searchJobHistory.update).toHaveBeenCalledTimes(1);
    const updateCall =
      prismaService.searchJobHistory.update.mock.calls.at(0)?.[0];

    expect(updateCall).toBeDefined();

    expect(updateCall?.where).toEqual({ jobId: 'search_1' });
    expect(updateCall?.data).toMatchObject({
      status: JobStatus.COMPLETED,
      attempts: 1,
      total: 1,
    });
  });
});
