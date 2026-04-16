import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScraperJobData } from './interfaces/scraper-job.interface';
import { ClassifyJobData } from './interfaces/classify-job.interface';

@Injectable()
export class QueuePublisher {
  constructor(
    @InjectQueue('scrape') private readonly scrapeQueue: Queue,
    @InjectQueue('classify') private readonly classifyQueue: Queue,
  ) {}

  async enqueueScrape(data: ScraperJobData): Promise<void> {
    await this.scrapeQueue.add('scrape', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    });
  }

  async enqueueClassify(data: ClassifyJobData): Promise<void> {
    await this.classifyQueue.add('classify', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    });
  }
}
