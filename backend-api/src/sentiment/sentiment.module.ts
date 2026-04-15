import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { ScraperModule } from '../scraper/scraper.module';
import { LLMModule } from '../llm/llm.module';
import { SentimentController } from './controllers/sentiment.controller';
import { SentimentProcessor } from './processors/sentiment.processor';

@Module({
  imports: [QueueModule, ScraperModule, LLMModule],
  controllers: [SentimentController],
  providers: [SentimentProcessor],
})
export class SentimentModule {}
