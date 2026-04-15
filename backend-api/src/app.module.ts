import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SentimentModule } from './sentiment/sentiment.module';

@Module({
  imports: [SentimentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}