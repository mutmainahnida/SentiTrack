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

  async findAll(limit = 20, offset = 0) {
    return this.prisma.searchJobHistory.findMany({
      where: { status: JobStatus.COMPLETED },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        jobId: true,
        query: true,
        product: true,
        total: true,
        status: true,
        createdAt: true,
        completedAt: true,
      },
    });
  }

  async findByJobId(jobId: string) {
    return this.prisma.searchJobHistory.findUnique({
      where: { jobId },
      select: {
        jobId: true,
        query: true,
        product: true,
        total: true,
        status: true,
        createdAt: true,
        completedAt: true,
        errorMessage: true,
        result: true,
      },
    });
  }

  async count() {
    return this.prisma.searchJobHistory.count({
      where: { status: JobStatus.COMPLETED },
    });
  }
}
