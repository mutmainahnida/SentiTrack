import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../queue/queue.constants';
import type { SearchJobData } from '../../queue/interfaces/search-job.interface';
import { SearchService } from '../services/search.service';

@Processor(QUEUE_NAMES.SEARCH)
export class SearchProcessor extends WorkerHost {
  private readonly logger = new Logger(SearchProcessor.name);

  constructor(private readonly searchService: SearchService) {
    super();
  }

  async process(job: Job<SearchJobData>): Promise<void> {
    try {
      await this.searchService.processJob(job);
    } catch (error: unknown) {
      await this.searchService.failJob(job, error);
      this.logger.error(
        `Search job ${job.data.jobId} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
