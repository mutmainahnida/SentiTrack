import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../queue/queue.constants';
import type { SentimentJobData } from '../../queue/interfaces/sentiment-job.interface';
import { SentimentService } from '../services/sentiment.service';

@Processor(QUEUE_NAMES.SENTIMENT)
export class SentimentProcessor extends WorkerHost {
  private readonly logger = new Logger(SentimentProcessor.name);

  constructor(private readonly sentimentService: SentimentService) {
    super();
  }

  async process(job: Job<SentimentJobData>): Promise<void> {
    const { jobId, query } = job.data;
    this.logger.log(`Processing sentiment job ${jobId}: query="${query}"`);

    try {
      await this.sentimentService.processJob(job);
    } catch (err: unknown) {
      await this.sentimentService.failJob(job, err);
      this.logger.error(`Sentiment job ${jobId} failed: ${String(err)}`);
      throw err;
    }
  }
}
