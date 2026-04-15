import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import {
  JOB_OPTIONS,
  JOB_RESULT_TTL_SECONDS,
  JOB_TIMEOUT_MS,
  QUEUE_NAMES,
  type QueueName,
} from './queue.constants';

interface QueueJobPayload {
  jobId: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private redis!: Redis;

  constructor(
    @InjectQueue(QUEUE_NAMES.SEARCH) private readonly searchQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SENTIMENT) private readonly sentimentQueue: Queue,
  ) {
    this.initRedis();
  }

  private initRedis() {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
    this.redis = new Redis({ host, port });
  }

  private getQueue(queueName: QueueName): Queue {
    const queues: Record<QueueName, Queue> = {
      [QUEUE_NAMES.SEARCH]: this.searchQueue,
      [QUEUE_NAMES.SENTIMENT]: this.sentimentQueue,
    };

    const queue = queues[queueName];
    if (!queue) throw new Error(`Unknown queue: ${queueName}`);

    return queue;
  }

  private getResultKey(queueName: QueueName, jobId: string): string {
    return `${queueName}:result:${jobId}`;
  }

  async enqueue<TPayload extends QueueJobPayload>(
    queueName: QueueName,
    data: TPayload,
  ): Promise<Job<QueueJobPayload>> {
    const queue = this.getQueue(queueName);

    const job = await queue.add(queueName, data, {
      ...JOB_OPTIONS,
      jobId: data.jobId,
    });

    return job;
  }

  async enqueueAndWait<TResult, TPayload extends QueueJobPayload>(
    queueName: QueueName,
    data: TPayload,
    timeoutMs = JOB_TIMEOUT_MS,
  ): Promise<TResult> {
    const job = await this.enqueue(queueName, data);
    const jobId = data.jobId;
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);
    const queueEvents = new QueueEvents(queueName, {
      connection: { host, port },
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        void queueEvents.close();
        reject(
          new Error(`Job ${jobId} processing timeout after ${timeoutMs}ms`),
        );
      }, timeoutMs);

      job
        .waitUntilFinished(queueEvents, timeoutMs)
        .then(() => {
          clearTimeout(timeout);
          return this.getResult(queueName, jobId);
        })
        .then((result) => {
          void queueEvents.close();
          if (!result) {
            reject(new Error(`No result found for job ${jobId}`));
          } else {
            resolve(result as TResult);
          }
        })
        .catch((err: Error) => {
          clearTimeout(timeout);
          void queueEvents.close();
          this.logger.error(`Job ${jobId} failed: ${err.message}`);
          reject(err);
        });
    });
  }

  async storeResult(
    queueName: QueueName,
    jobId: string,
    result: unknown,
  ): Promise<void> {
    await this.redis.setex(
      this.getResultKey(queueName, jobId),
      JOB_RESULT_TTL_SECONDS,
      JSON.stringify(result),
    );
  }

  private async getResult(
    queueName: QueueName,
    jobId: string,
  ): Promise<unknown> {
    const raw = await this.redis.get(this.getResultKey(queueName, jobId));
    if (!raw) throw new Error(`Result not found for job ${jobId}`);
    return JSON.parse(raw);
  }
}
