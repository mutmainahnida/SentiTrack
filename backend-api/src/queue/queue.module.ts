import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { QueueService } from './queue.service';
import { QUEUE_NAMES } from './queue.constants';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.SENTIMENT }),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
