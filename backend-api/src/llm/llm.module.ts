import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenRouterService } from './openrouter.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../.env', '.env'] })],
  providers: [OpenRouterService],
  exports: [OpenRouterService],
})
export class LLMModule {}
