import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { QueuePublisher } from './queue-publisher.service';
import { SentimentRepository } from '../sentiment/repositories/sentiment.repository';
import type { PipelineState } from './interfaces/pipeline-state.interface';
import type {
  ScrapeResultPayload,
  ClassifyResultPayload,
  PipelineErrorPayload,
} from './interfaces/channel-payloads.interface';
import type { SentimentResult, SearchProduct } from './interfaces/sentiment-job.interface';

@Injectable()
export class PipelineOrchestrator implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PipelineOrchestrator.name);
  private readonly redis: Redis;
  private readonly subscriber: Redis;
  private pendingRequests = new Map<
    string,
    {
      resolve: (result: unknown) => void;
      reject: (err: unknown) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  private readonly REQUEST_TIMEOUT_MS = 300_000; // 5 minutes

  constructor(
    private readonly config: ConfigService,
    private readonly queuePublisher: QueuePublisher,
    private readonly sentimentRepo: SentimentRepository,
  ) {
    const host = this.config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = this.config.get<number>('REDIS_PORT') ?? 6379;

    this.redis = new Redis({ host, port, lazyConnect: true });
    this.subscriber = new Redis({ host, port, lazyConnect: true });
  }

  async onModuleInit(): Promise<void> {
    await this.redis.connect();
    await this.subscriber.connect();

    // Subscribe to scrape result channel pattern
    await this.subscriber.psubscribe('ch:scrape:*');
    this.subscriber.on('pmessage', this.handleScrapeMessage.bind(this));

    // Subscribe to classify result channel pattern
    await this.subscriber.psubscribe('ch:classify:*');
    this.subscriber.on('pmessage', this.handleClassifyMessage.bind(this));

    this.logger.log('PipelineOrchestrator subscribed to Redis pub/sub channels');
  }

  async onModuleDestroy(): Promise<void> {
    for (const { reject, timeout } of this.pendingRequests.values()) {
      clearTimeout(timeout);
      reject(new Error('Pipeline shutting down'));
    }
    await this.subscriber.punsubscribe();
    await this.subscriber.quit();
    await this.redis.quit();
  }

  async startPipeline(params: {
    sentimentId: string;
    query: string;
    product: SearchProduct;
    limit: number;
  }): Promise<SentimentResult> {
    const { sentimentId, query, product, limit } = params;

    // Set initial pipeline state in Redis
    const initialState: PipelineState = { status: 'pending', query };
    await this.redis.setex(`sentiment:${sentimentId}`, 3600, JSON.stringify(initialState));

    // Enqueue scrape job
    await this.queuePublisher.enqueueScrape({ sentimentId, query, product, limit });

    // Wait for scrape result via pub/sub
    const scrapeResult = await this.waitForChannel(`ch:scrape:${sentimentId}`);

    if ((scrapeResult as PipelineErrorPayload).error) {
      const err = scrapeResult as PipelineErrorPayload;
      await this.redis.setex(
        `sentiment:${sentimentId}`,
        3600,
        JSON.stringify({ status: 'failed', errorMessage: err.message }),
      );
      throw new Error(`Scrape failed: ${err.message}`);
    }

    const scrape = scrapeResult as ScrapeResultPayload;

    // Enqueue classify job
    await this.queuePublisher.enqueueClassify({ sentimentId, tweets: scrape.tweets });

    // Wait for classify result via pub/sub
    const classifyResult = await this.waitForChannel(`ch:classify:${sentimentId}`);

    if ((classifyResult as PipelineErrorPayload).error) {
      const err = classifyResult as PipelineErrorPayload;
      await this.redis.setex(
        `sentiment:${sentimentId}`,
        3600,
        JSON.stringify({ status: 'failed', errorMessage: err.message }),
      );
      throw new Error(`Classify failed: ${err.message}`);
    }

    const classify = classifyResult as ClassifyResultPayload;

    // Persist final result to Postgres
    await this.sentimentRepo.markCompleted(sentimentId, classify.result, 1);

    // Cleanup Redis state
    await this.redis.del(`sentiment:${sentimentId}`);

    return classify.result;
  }

  private waitForChannel(channel: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const sentimentId = channel.split(':')[2];
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(sentimentId);
        reject(new Error(`Pipeline timeout for ${sentimentId}`));
      }, this.REQUEST_TIMEOUT_MS);
      this.pendingRequests.set(sentimentId, { resolve, reject, timeout });
    });
  }

  private handleScrapeMessage(_pattern: string, _channel: string, message: string): void {
    try {
      const payload = JSON.parse(message) as ScrapeResultPayload | PipelineErrorPayload;
      const { sentimentId } = payload;
      const pending = this.pendingRequests.get(sentimentId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(payload);
        this.pendingRequests.delete(sentimentId);
      }
    } catch {
      // Ignore malformed messages
    }
  }

  private handleClassifyMessage(_pattern: string, _channel: string, message: string): void {
    try {
      const payload = JSON.parse(message) as ClassifyResultPayload | PipelineErrorPayload;
      const { sentimentId } = payload;
      const pending = this.pendingRequests.get(sentimentId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(payload);
        this.pendingRequests.delete(sentimentId);
      }
    } catch {
      // Ignore malformed messages
    }
  }
}
