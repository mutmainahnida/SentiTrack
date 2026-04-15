import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScraperService } from '../../scraper/scraper.service';
import { OpenRouterService } from '../../llm/openrouter.service';
import { QueueService } from '../../queue/queue.service';
import { QUEUE_NAMES } from '../../queue/queue.constants';
import type { SentimentJobData } from '../../queue/interfaces/sentiment-job.interface';

@Processor(QUEUE_NAMES.SENTIMENT)
export class SentimentProcessor extends WorkerHost {
  private readonly logger = new Logger(SentimentProcessor.name);

  constructor(
    private readonly scraperService: ScraperService,
    private readonly openRouterService: OpenRouterService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<SentimentJobData>): Promise<void> {
    const { jobId, query, product, limit } = job.data;
    this.logger.log(`Processing job ${jobId}: query="${query}"`);

    try {
      const scraped = await this.scraperService.fetchTweets(
        query,
        product,
        limit,
      );
      const result = await this.openRouterService.analyzeTweets(scraped.tweets);
      result.query = query;

      await this.queueService.storeResult(jobId, result);

      this.logger.log(
        `Job ${jobId} completed: ${scraped.count} tweets, ` +
          `pos=${result.summary.positive}% neg=${result.summary.negative}% neu=${result.summary.neutral}%`,
      );
    } catch (err) {
      this.logger.error(`Job ${jobId} failed: ${err}`);
      throw err;
    }
  }
}
