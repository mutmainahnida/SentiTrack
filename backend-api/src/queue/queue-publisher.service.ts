import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScraperJobData } from './interfaces/scraper-job.interface';
import { ClassifyJobData } from './interfaces/classify-job.interface';
import { JOB_OPTIONS, QUEUE_NAMES } from './queue.constants';

@Injectable()
export class QueuePublisher {
  constructor(
    @InjectQueue(QUEUE_NAMES.SCRAPE) private readonly scrapeQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CLASSIFY) private readonly classifyQueue: Queue,
  ) {}

  async enqueueScrape(data: ScraperJobData): Promise<void> {
    await this.scrapeQueue.add(QUEUE_NAMES.SCRAPE, data, JOB_OPTIONS);
  }

  async enqueueClassify(data: ClassifyJobData): Promise<void> {
    await this.classifyQueue.add(QUEUE_NAMES.CLASSIFY, data, JOB_OPTIONS);
  }
}
