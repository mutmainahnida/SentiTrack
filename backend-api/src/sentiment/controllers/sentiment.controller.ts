import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { QueueService } from '../../queue/queue.service';
import { QUEUE_NAMES } from '../../queue/queue.constants';
import type { CreateSentimentDto } from '../dto/create-sentiment.dto';
import type { SentimentJobData } from '../../queue/interfaces/sentiment-job.interface';

@Controller('api/sentiment')
export class SentimentController {
  constructor(private readonly queueService: QueueService) {}

  @Post()
  async analyze(@Body() dto: CreateSentimentDto) {
    const jobId = `sentiment_${Date.now()}`;
    const jobData: SentimentJobData = {
      jobId,
      query: dto.query,
      product: dto.product ?? 'Top',
      limit: dto.limit ?? 100,
    };

    try {
      const result = await this.queueService.enqueueAndWait(
        QUEUE_NAMES.SENTIMENT,
        jobData,
        120000,
      );

      return {
        jobId,
        status: 'completed',
        createdAt: new Date().toISOString(),
        result,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('timeout')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.GATEWAY_TIMEOUT,
            message: `Job processing timeout after 120000ms`,
            jobId,
          },
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: message || 'Internal server error',
          jobId,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
