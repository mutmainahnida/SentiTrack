import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { ScraperModule } from '../scraper/scraper.module';
import { LLMModule } from '../llm/llm.module';
import { SentimentController } from './controllers/sentiment.controller';
import { SentimentProcessor } from './processors/sentiment.processor';
import { SentimentRepository } from './repositories/sentiment.repository';
import { SentimentService } from './services/sentiment.service';

@Module({
  imports: [PrismaModule, QueueModule, ScraperModule, LLMModule],
  controllers: [SentimentController],
  providers: [SentimentProcessor, SentimentRepository, SentimentService],
})
export class SentimentModule {}
