import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { SentimentProcessor } from './sentiment.processor';
import { ScraperService } from '../../scraper/scraper.service';
import { OpenRouterService } from '../../llm/openrouter.service';
import { QueueService } from '../../queue/queue.service';

describe('SentimentProcessor', () => {
  let processor: SentimentProcessor;
  let mockScraper: jest.Mocked<ScraperService>;
  let mockOpenRouter: jest.Mocked<OpenRouterService>;
  let mockQueue: jest.Mocked<QueueService>;

  const mockJobData = {
    jobId: 'sentiment_123',
    query: 'AI',
    product: 'Top' as const,
    limit: 10,
  };

  beforeEach(async () => {
    mockScraper = {
      fetchTweets: jest.fn(),
    } as unknown as jest.Mocked<ScraperService>;

    mockOpenRouter = {
      analyzeTweets: jest.fn(),
    } as unknown as jest.Mocked<OpenRouterService>;

    mockQueue = {
      storeResult: jest.fn(),
    } as unknown as jest.Mocked<QueueService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentimentProcessor,
        { provide: ScraperService, useValue: mockScraper },
        { provide: OpenRouterService, useValue: mockOpenRouter },
        { provide: QueueService, useValue: mockQueue },
      ],
    }).compile();

    processor = module.get<SentimentProcessor>(SentimentProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should scrape, analyze, and store result', async () => {
      const mockJob = { data: mockJobData } as Job;
      const scrapedTweets = [
        {
          id: '1',
          text: 'great AI',
          username: 'user',
          name: 'User',
          timestamp: 1234567890,
          likes: 10,
          retweets: 5,
          replies: 2,
          views: 100,
          permanentUrl: 'https://x.com/user/status/1',
        },
      ];
      const sentimentResult = {
        query: '',
        total: 1,
        summary: { positive: 100, negative: 0, neutral: 0 },
        topInfluential: [],
        tweets: [],
        completedAt: '2026-04-15',
      };

      mockScraper.fetchTweets.mockResolvedValue({
        query: 'AI',
        product: 'Top',
        count: 1,
        tweets: scrapedTweets,
      });
      mockOpenRouter.analyzeTweets.mockResolvedValue(sentimentResult);
      mockQueue.storeResult.mockResolvedValue();

      await processor.process(mockJob);

      expect(mockScraper.fetchTweets).toHaveBeenCalledWith('AI', 'Top', 10);
      expect(mockOpenRouter.analyzeTweets).toHaveBeenCalledWith(scrapedTweets);
      expect(mockQueue.storeResult).toHaveBeenCalledWith(
        'sentiment_123',
        sentimentResult,
      );
    });

    it('should set query on result', async () => {
      const mockJob = { data: mockJobData } as Job;
      mockScraper.fetchTweets.mockResolvedValue({
        query: 'AI',
        product: 'Top',
        count: 1,
        tweets: [],
      });
      mockOpenRouter.analyzeTweets.mockResolvedValue({
        query: '',
        total: 0,
        summary: { positive: 0, negative: 0, neutral: 0 },
        topInfluential: [],
        tweets: [],
        completedAt: '2026-04-15',
      });

      await processor.process(mockJob);

      expect(mockQueue.storeResult).toHaveBeenCalledWith(
        'sentiment_123',
        expect.objectContaining({ query: 'AI' }),
      );
    });
  });
});
