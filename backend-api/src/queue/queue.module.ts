import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { QueueService } from './queue.service';
import { QueuePublisher } from './queue-publisher.service';
import { PipelineOrchestrator } from './pipeline-orchestrator.service';
import { QUEUE_NAMES } from './queue.constants';
import { SentimentModule } from '../sentiment/sentiment.module';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        family: 4,
        maxRetriesPerRequest: null,
      },
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.SEARCH }),
    BullModule.registerQueue({ name: QUEUE_NAMES.SENTIMENT }),
    BullModule.registerQueue({ name: QUEUE_NAMES.SCRAPE }),
    BullModule.registerQueue({ name: QUEUE_NAMES.CLASSIFY }),
    forwardRef(() => SentimentModule),
  ],
  providers: [QueueService, QueuePublisher, PipelineOrchestrator],
  exports: [QueueService, QueuePublisher, PipelineOrchestrator],
})
export class QueueModule {}
