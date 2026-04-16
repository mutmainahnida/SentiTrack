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
import type { CreateSearchDto } from '../dto/create-search.dto';
import { SearchService } from '../services/search.service';

@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') q?: string,
    @Query('query') query?: string,
    @Query('product') product?: string,
    @Query('limit') limit?: string,
    @Query('jobId') jobId?: string,
    @Query('page') page?: string,
    @Query('take') take?: string,
  ) {
    if (q === undefined && query === undefined && !jobId) {
      const pageNum = Math.max(1, Number.parseInt(page ?? '1', 10));
      const takeNum = Math.min(50, Math.max(1, Number.parseInt(take ?? '20', 10)));
      const offset = (pageNum - 1) * takeNum;
      const { items, total } = await this.searchService.getHistory(takeNum, offset);
      return {
        data: items,
        pagination: {
          page: pageNum,
          take: takeNum,
          total,
          totalPages: Math.ceil(total / takeNum),
        },
      };
    }

    if (jobId) {
      const record = await this.searchService.getByJobId(jobId);
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

    return this.handleRequest({
      query: resolvedQuery,
      product: product === 'Latest' ? 'Latest' : 'Top',
      limit: this.parseLimit(limit, 20),
    });
  }

  @Post()
  async create(@Body() dto: CreateSearchDto) {
    if (!dto.query?.trim()) {
      throw new BadRequestException('query is required');
    }

    return this.handleRequest({
      query: dto.query.trim(),
      product: dto.product ?? 'Top',
      limit: dto.limit ?? 20,
    });
  }

  private parseLimit(limit: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(limit ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private async handleRequest(dto: CreateSearchDto) {
    try {
      return await this.searchService.requestSearch(dto);
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
