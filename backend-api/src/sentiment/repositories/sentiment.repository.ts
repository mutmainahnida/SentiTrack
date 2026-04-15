import { Injectable } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import type { SentimentResult } from '../../queue/interfaces/sentiment-job.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SentimentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toResultSnapshot(result: SentimentResult): Prisma.InputJsonObject {
    return {
      query: result.query,
      total: result.total,
      summary: {
        positive: result.summary.positive,
        negative: result.summary.negative,
        neutral: result.summary.neutral,
      },
      topInfluential: result.topInfluential.map((tweet) => ({
        tweetId: tweet.tweetId,
        text: tweet.text,
        username: tweet.username,
        views: tweet.views,
        likes: tweet.likes,
        retweets: tweet.retweets,
        replies: tweet.replies,
        sentiment: tweet.sentiment,
        sentimentScore: tweet.sentimentScore,
        influenceScore: tweet.influenceScore,
      })),
      tweets: result.tweets.map((tweet) => ({
        tweetId: tweet.tweetId,
        text: tweet.text,
        username: tweet.username,
        views: tweet.views,
        likes: tweet.likes,
        retweets: tweet.retweets,
        replies: tweet.replies,
        sentiment: tweet.sentiment,
        sentimentScore: tweet.sentimentScore,
        influenceScore: tweet.influenceScore,
      })),
      completedAt: result.completedAt,
    };
  }

  async createQueuedJob(data: {
    userId: string;
    jobId: string;
    query: string;
    product: string;
    limit: number;
  }) {
    return this.prisma.sentimentJobHistory.create({
      data: {
        userId: data.userId,
        jobId: data.jobId,
        query: data.query,
        product: data.product,
        requestedLimit: data.limit,
        status: JobStatus.QUEUED,
      },
    });
  }

  async markProcessing(jobId: string, attempts: number) {
    return this.prisma.sentimentJobHistory.update({
      where: { jobId },
      data: {
        status: JobStatus.PROCESSING,
        attempts,
        errorMessage: null,
        startedAt: new Date(),
      },
    });
  }

  async markCompleted(
    jobId: string,
    result: SentimentResult,
    attempts: number,
  ) {
    return this.prisma.sentimentJobHistory.update({
      where: { jobId },
      data: {
        status: JobStatus.COMPLETED,
        attempts,
        total: result.total,
        positivePct: result.summary.positive,
        negativePct: result.summary.negative,
        neutralPct: result.summary.neutral,
        result: this.toResultSnapshot(result),
        errorMessage: null,
        completedAt: new Date(result.completedAt),
      },
    });
  }

  async findHistory(userId: string, isAdmin: boolean) {
    return this.prisma.sentimentJobHistory.findMany({
      where: isAdmin ? {} : { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markFailed(jobId: string, errorMessage: string, attempts: number) {
    return this.prisma.sentimentJobHistory.update({
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
    return this.prisma.sentimentJobHistory.findMany({
      where: { status: JobStatus.COMPLETED },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        jobId: true,
        query: true,
        product: true,
        total: true,
        positivePct: true,
        negativePct: true,
        neutralPct: true,
        status: true,
        createdAt: true,
        completedAt: true,
        result: true,
      },
    });
  }

  async findByJobId(jobId: string) {
    return this.prisma.sentimentJobHistory.findUnique({
      where: { jobId },
      select: {
        jobId: true,
        query: true,
        product: true,
        total: true,
        positivePct: true,
        negativePct: true,
        neutralPct: true,
        status: true,
        createdAt: true,
        completedAt: true,
        errorMessage: true,
        result: true,
      },
    });
  }

  async count() {
    return this.prisma.sentimentJobHistory.count({
      where: { status: JobStatus.COMPLETED },
    });
  }
}
