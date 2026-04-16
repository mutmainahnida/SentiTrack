import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponseFactory } from '../../common/api-response.util';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateSentimentDto } from '../dto/create-sentiment.dto';
import { SentimentService } from '../services/sentiment.service';

@Controller('api/sentiment')
@UseGuards(JwtAuthGuard)
export class SentimentController {
  constructor(
    private readonly sentimentService: SentimentService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('/history')
  async getHistory(@CurrentUser('email') email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    const history = await this.sentimentService.getHistory(user.id, user.roleId === 1);
    return ApiResponseFactory.success('History retrieved', history);
  }

  @Get()
  async analyzeFromQuery(
    @CurrentUser('email') email: string,
    @Query('q') q?: string,
    @Query('query') query?: string,
    @Query('product') product?: string,
    @Query('limit') limit?: string,
    @Query('jobId') jobId?: string,
  ) {
    if (jobId) {
      const record = await this.sentimentService.getByJobId(jobId);
      if (!record) {
        throw new BadRequestException(`Job not found: ${jobId}`);
      }
      return {
        jobId: record.jobId,
        status: record.status.toLowerCase(),
        createdAt: record.createdAt.toISOString(),
        result: record.result,
      };
    }

    const resolvedQuery = (q ?? query ?? '').trim();
    if (!resolvedQuery) {
      throw new BadRequestException('query is required');
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    return this.handleRequest(
      {
        query: resolvedQuery,
        product: product === 'Latest' ? 'Latest' : 'Top',
        limit: this.parseLimit(limit, 100),
      },
      user.id,
    );
  }

  @Post()
  async analyze(
    @CurrentUser('email') email: string,
    @Body() dto: CreateSentimentDto,
  ) {
    if (!dto.query?.trim()) {
      throw new BadRequestException('query is required');
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    return this.handleRequest(
      {
        query: dto.query.trim(),
        product: dto.product ?? 'Top',
        limit: dto.limit ?? 100,
      },
      user.id,
    );
  }

  private parseLimit(limit: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(limit ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private async handleRequest(dto: CreateSentimentDto, userId: string) {
    try {
      const result = await this.sentimentService.requestSentiment(dto, userId);
      return ApiResponseFactory.success('Sentiment analysis completed', result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: message || 'Internal error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}