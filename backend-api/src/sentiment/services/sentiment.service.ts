import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PipelineOrchestrator } from '../../queue/pipeline-orchestrator.service';
import type { SentimentResult } from '../../queue/interfaces/sentiment-job.interface';
import type { CreateSentimentDto } from '../dto/create-sentiment.dto';
import { SentimentRepository } from '../repositories/sentiment.repository';

@Injectable()
export class SentimentService {
  constructor(
    private readonly pipelineOrchestrator: PipelineOrchestrator,
    private readonly sentimentRepository: SentimentRepository,
  ) {}

  async requestSentiment(
    dto: CreateSentimentDto,
    userId: string,
  ): Promise<{
    id: string;
    query: string;
    status: 'completed';
    summary: { positive: number; negative: number; neutral: number };
    topInfluential: SentimentResult['topInfluential'];
    tweets: SentimentResult['tweets'];
    completedAt: string;
  }> {
    const id = `sentiment_${Date.now()}_${randomUUID().slice(0, 8)}`;

    await this.sentimentRepository.createQueuedJob({
      userId,
      jobId: id,
      query: dto.query,
      product: dto.product ?? 'Top',
      limit: dto.limit ?? 100,
    });

    await this.sentimentRepository.markProcessing(id, 1);

    let result: SentimentResult;
    try {
      result = await this.pipelineOrchestrator.startPipeline({
        sentimentId: id,
        query: dto.query,
        product: dto.product ?? 'Top',
        limit: dto.limit ?? 100,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await this.sentimentRepository.markFailed(id, message, 1);
      throw err;
    }

    return {
      id,
      query: result.query,
      status: 'completed' as const,
      summary: result.summary,
      topInfluential: result.topInfluential,
      tweets: result.tweets,
      completedAt: result.completedAt,
    };
  }

  async getHistory(userId: string, isAdmin: boolean) {
    return this.sentimentRepository.findHistory(userId, isAdmin);
  }

  async getByJobId(jobId: string) {
    return this.sentimentRepository.findByJobId(jobId);
  }
}