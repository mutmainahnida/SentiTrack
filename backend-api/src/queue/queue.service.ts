import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { QUEUE_NAMES, type QueueName } from './queue.constants';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private redis!: Redis;
  private readonly RESULT_PREFIX = 'sentiment:result:';
  private readonly RESULT_TTL = 86400; 

  constructor(
    @InjectQueue(QUEUE_NAMES.SENTIMENT) private readonly sentimentQueue: Queue,
  ) {
    this.initRedis();
  }

  private initRedis() {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
    this.redis = new Redis({ host, port });
  }

  async enqueue<T>(queueName: QueueName, data: T): Promise<Job> {
    const queue =
      queueName === QUEUE_NAMES.SENTIMENT ? this.sentimentQueue : null;
    if (!queue) throw new Error(`Unknown queue: ${queueName}`);

    return queue.add(queueName, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async enqueueAndWait<T>(
    queueName: QueueName,
    data: T,
    timeoutMs = 120000,
  ): Promise<T> {
    const job = await this.enqueue(queueName, data);
    const jobId = (data as { jobId: string }).jobId;
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
    const queueEvents = new QueueEvents(queueName, {
      connection: { host, port },
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        queueEvents.close();
        reject(
          new Error(`Job ${jobId} processing timeout after ${timeoutMs}ms`),
        );
      }, timeoutMs);

      job
        .waitUntilFinished(queueEvents, timeoutMs)
        .then(() => {
          clearTimeout(timeout);
          return this.getResult(jobId);
        })
        .then((result) => {
          queueEvents.close();
          if (!result) {
            reject(new Error(`No result found for job ${jobId}`));
          } else {
            resolve(result as T);
          }
        })
        .catch((err: Error) => {
          clearTimeout(timeout);
          queueEvents.close();
          this.logger.error(`Job ${jobId} failed: ${err.message}`);
          reject(err);
        });
    });
  }

  async storeResult(jobId: string, result: unknown): Promise<void> {
    await this.redis.setex(
      `${this.RESULT_PREFIX}${jobId}`,
      this.RESULT_TTL,
      JSON.stringify(result),
    );
  }

  private async getResult(jobId: string): Promise<unknown> {
    const raw = await this.redis.get(`${this.RESULT_PREFIX}${jobId}`);
    if (!raw) throw new Error(`Result not found for job ${jobId}`);
    return JSON.parse(raw);
  }
}
