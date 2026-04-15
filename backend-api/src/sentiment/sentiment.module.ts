import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { ScraperModule } from '../scraper/scraper.module';
import { LLMModule } from '../llm/llm.module';
import { SentimentController } from './controllers/sentiment.controller';
import { SentimentProcessor } from './processors/sentiment.processor';
import { SentimentRepository } from './repositories/sentiment.repository';
import { SentimentService } from './services/sentiment.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET')!,
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d')! as any },
      }),
    }),
    PrismaModule,
    QueueModule,
    ScraperModule,
    LLMModule,
  ],
  controllers: [SentimentController],
  providers: [SentimentProcessor, SentimentRepository, SentimentService],
})
export class SentimentModule {}
