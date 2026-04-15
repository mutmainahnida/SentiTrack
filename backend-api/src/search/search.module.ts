import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { ScraperModule } from '../scraper/scraper.module';
import { SearchController } from './controllers/search.controller';
import { SearchProcessor } from './processors/search.processor';
import { SearchRepository } from './repositories/search.repository';
import { SearchService } from './services/search.service';

@Module({
  imports: [PrismaModule, QueueModule, ScraperModule],
  controllers: [SearchController],
  providers: [SearchProcessor, SearchRepository, SearchService],
})
export class SearchModule {}
