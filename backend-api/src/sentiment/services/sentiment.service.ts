import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { JobRequestFailedError } from '../../common/errors/job-request-failed.error';
import { JobRequestTimeoutError } from '../../common/errors/job-request-timeout.error';
import type { JobResponse } from '../../common/interfaces/job-response.interface';
import { GeminiService } from '../../llm/gemini.service';
import { JOB_TIMEOUT_MS, QUEUE_NAMES } from '../../queue/queue.constants';
import type {
  SentimentJobData,
  SentimentResult,
} from '../../queue/interfaces/sentiment-job.interface';
import { QueueService } from '../../queue/queue.service';
import { ScraperService } from '../../scraper/scraper.service';
import type { CreateSentimentDto } from '../dto/create-sentiment.dto';
import { SentimentRepository } from '../repositories/sentiment.repository';

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly scraperService: ScraperService,
    private readonly geminiService: GeminiService,
    private readonly sentimentRepository: SentimentRepository,
  ) {}

  async requestSentiment(
    dto: CreateSentimentDto,
    userId: string,
  ): Promise<JobResponse<SentimentResult>> {
    const jobId = `sentiment_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const jobData: SentimentJobData = {
      jobId,
      query: dto.query,
      product: dto.product ?? 'Top',
      limit: dto.limit ?? 100,
    };

    await this.sentimentRepository.createQueuedJob({
      userId,
      jobId,
      query: jobData.query,
      product: jobData.product,
      limit: jobData.limit,
    });

    try {
      const result = await this.queueService.enqueueAndWait<
        SentimentResult,
        SentimentJobData
      >(QUEUE_NAMES.SENTIMENT, jobData, JOB_TIMEOUT_MS);

      return {
        jobId,
        status: 'completed',
        createdAt: new Date().toISOString(),
        result,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('timeout')) {
        throw new JobRequestTimeoutError(
          jobId,
          `Job processing timeout after ${JOB_TIMEOUT_MS}ms`,
        );
      }

      throw new JobRequestFailedError(
        jobId,
        message || 'Job processing failed',
      );
    }
  }

  async processJob(job: Job<SentimentJobData>): Promise<void> {
    const attempts = job.attemptsMade + 1;
    await this.sentimentRepository.markProcessing(job.data.jobId, attempts);

    let scraped: Awaited<ReturnType<typeof this.scraperService.fetchTweets>>;
    try {
      scraped = await this.scraperService.fetchTweets(
        job.data.query,
        job.data.product,
        job.data.limit,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      this.logger.error(`Scraper failed for job ${job.data.jobId}: ${msg}`);
      throw new Error(`Scraper error: ${msg}`);
    }

    if (scraped.tweets.length === 0) {
      this.logger.warn(
        `Sentiment job ${job.data.jobId}: scraper returned 0 tweets for query "${job.data.query}". Marking as completed with empty result.`,
      );
      const emptyResult: SentimentResult = {
        query: job.data.query,
        total: 0,
        summary: { positive: 0, negative: 0, neutral: 100 },
        topInfluential: [],
        tweets: [],
        completedAt: new Date().toISOString(),
      };
      await this.sentimentRepository.markCompleted(
        job.data.jobId,
        emptyResult,
        attempts,
      );
      await this.queueService.storeResult(
        QUEUE_NAMES.SENTIMENT,
        job.data.jobId,
        emptyResult,
      );
      return;
    }

    const result = await this.geminiService.analyzeTweets(scraped.tweets);
    result.query = job.data.query;

    // Guard against NaN from divide-by-zero when no tweets returned
    if (result.total === 0) {
      result.summary = { positive: 0, negative: 0, neutral: 100 };
    }

    await this.sentimentRepository.markCompleted(
      job.data.jobId,
      result,
      attempts,
    );
    await this.queueService.storeResult(
      QUEUE_NAMES.SENTIMENT,
      job.data.jobId,
      result,
    );

    this.logger.log(
      `Sentiment job ${job.data.jobId} completed: ${scraped.count} tweets, pos=${result.summary.positive}% neg=${result.summary.negative}% neu=${result.summary.neutral}%`,
    );
  }

  async failJob(job: Job<SentimentJobData>, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    await this.sentimentRepository.markFailed(
      job.data.jobId,
      message,
      job.attemptsMade + 1,
    );
  }

  async getHistory(userId: string, isAdmin: boolean) {
    return this.sentimentRepository.findHistory(userId, isAdmin);
  }

  async getByJobId(jobId: string) {
    return this.sentimentRepository.findByJobId(jobId);
  }
}
