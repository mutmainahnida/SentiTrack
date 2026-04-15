import { Injectable } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import type { SearchResult } from '../../queue/interfaces/search-job.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toResultSnapshot(result: SearchResult): Prisma.InputJsonObject {
    return {
      query: result.query,
      product: result.product,
      count: result.count,
      completedAt: result.completedAt,
      tweets: result.tweets.map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        username: tweet.username,
        name: tweet.name,
        timestamp: tweet.timestamp,
        likes: tweet.likes,
        retweets: tweet.retweets,
        replies: tweet.replies,
        views: tweet.views,
        permanentUrl: tweet.permanentUrl,
      })),
    };
  }

  async createQueuedJob(data: {
    jobId: string;
    query: string;
    product: string;
    limit: number;
  }) {
    return this.prisma.searchJobHistory.create({
      data: {
        jobId: data.jobId,
        query: data.query,
        product: data.product,
        requestedLimit: data.limit,
        status: JobStatus.QUEUED,
      },
    });
  }

  async markProcessing(jobId: string, attempts: number) {
    return this.prisma.searchJobHistory.update({
      where: { jobId },
      data: {
        status: JobStatus.PROCESSING,
        attempts,
        errorMessage: null,
        startedAt: new Date(),
      },
    });
  }

  async markCompleted(jobId: string, result: SearchResult, attempts: number) {
    return this.prisma.searchJobHistory.update({
      where: { jobId },
      data: {
        status: JobStatus.COMPLETED,
        attempts,
        total: result.count,
        result: this.toResultSnapshot(result),
        errorMessage: null,
        completedAt: new Date(result.completedAt),
      },
    });
  }

  async markFailed(jobId: string, errorMessage: string, attempts: number) {
    return this.prisma.searchJobHistory.update({
      where: { jobId },
      data: {
        status: JobStatus.FAILED,
        attempts,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }
}
