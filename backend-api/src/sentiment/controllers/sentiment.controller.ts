import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { JobRequestFailedError } from '../../common/errors/job-request-failed.error';
import { JobRequestTimeoutError } from '../../common/errors/job-request-timeout.error';
import type { CreateSentimentDto } from '../dto/create-sentiment.dto';
import { SentimentService } from '../services/sentiment.service';

@Controller('api/sentiment')
export class SentimentController {
  constructor(private readonly sentimentService: SentimentService) {}

  @Get()
  async analyzeFromQuery(
    @Query('q') q?: string,
    @Query('query') query?: string,
    @Query('product') product?: string,
    @Query('limit') limit?: string,
  ) {
    const resolvedQuery = (q ?? query ?? '').trim();
    if (!resolvedQuery) {
      throw new BadRequestException('query is required');
    }

    return this.handleRequest({
      query: resolvedQuery,
      product: product === 'Latest' ? 'Latest' : 'Top',
      limit: this.parseLimit(limit, 100),
    });
  }

  @Post()
  async analyze(@Body() dto: CreateSentimentDto) {
    if (!dto.query?.trim()) {
      throw new BadRequestException('query is required');
    }

    return this.handleRequest({
      query: dto.query.trim(),
      product: dto.product ?? 'Top',
      limit: dto.limit ?? 100,
    });
  }

  private parseLimit(limit: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(limit ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private async handleRequest(dto: CreateSentimentDto) {
    try {
      return await this.sentimentService.requestSentiment(dto);
    } catch (err: unknown) {
      if (err instanceof JobRequestTimeoutError) {
        throw new HttpException(
          {
            statusCode: HttpStatus.GATEWAY_TIMEOUT,
            message: err.message,
            jobId: err.jobId,
          },
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      if (err instanceof JobRequestFailedError) {
        throw new HttpException(
          {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: err.message,
            jobId: err.jobId,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: message || 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
