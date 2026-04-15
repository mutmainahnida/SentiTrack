import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { JobRequestFailedError } from '../../common/errors/job-request-failed.error';
import { JobRequestTimeoutError } from '../../common/errors/job-request-timeout.error';
import type { JobResponse } from '../../common/interfaces/job-response.interface';
import { JOB_TIMEOUT_MS, QUEUE_NAMES } from '../../queue/queue.constants';
import type {
  SearchJobData,
  SearchResult,
} from '../../queue/interfaces/search-job.interface';
import { QueueService } from '../../queue/queue.service';
import { ScraperService } from '../../scraper/scraper.service';
import type { CreateSearchDto } from '../dto/create-search.dto';
import { SearchRepository } from '../repositories/search.repository';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly scraperService: ScraperService,
    private readonly searchRepository: SearchRepository,
  ) {}

  async requestSearch(
    dto: CreateSearchDto,
  ): Promise<JobResponse<SearchResult>> {
    const jobId = `search_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const jobData: SearchJobData = {
      jobId,
      query: dto.query,
      product: dto.product ?? 'Top',
      limit: dto.limit ?? 20,
    };

    await this.searchRepository.createQueuedJob({
      jobId,
      query: jobData.query,
      product: jobData.product,
      limit: jobData.limit,
    });

    try {
      const result = await this.queueService.enqueueAndWait<
        SearchResult,
        SearchJobData
      >(QUEUE_NAMES.SEARCH, jobData, JOB_TIMEOUT_MS);

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

  async processJob(job: Job<SearchJobData>): Promise<void> {
    const attempts = job.attemptsMade + 1;
    await this.searchRepository.markProcessing(job.data.jobId, attempts);

    const scraped = await this.scraperService.fetchTweets(
      job.data.query,
      job.data.product,
      job.data.limit,
    );

    const result: SearchResult = {
      ...scraped,
      query: job.data.query,
      product: job.data.product,
      completedAt: new Date().toISOString(),
    };

    await this.searchRepository.markCompleted(job.data.jobId, result, attempts);
    await this.queueService.storeResult(
      QUEUE_NAMES.SEARCH,
      job.data.jobId,
      result,
    );

    this.logger.log(
      `Search job ${job.data.jobId} completed with ${result.count} tweets for "${job.data.query}"`,
    );
  }

  async failJob(job: Job<SearchJobData>, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    await this.searchRepository.markFailed(
      job.data.jobId,
      message,
      job.attemptsMade + 1,
    );
  }

  async getHistory(limit = 20, offset = 0) {
    const [items, total] = await Promise.all([
      this.searchRepository.findAll(limit, offset),
      this.searchRepository.count(),
    ]);
    return { items, total };
  }

  async getByJobId(jobId: string) {
    return this.searchRepository.findByJobId(jobId);
  }
}
