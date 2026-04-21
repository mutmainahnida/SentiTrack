import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { SentimentController } from './controllers/sentiment.controller';
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
    forwardRef(() => QueueModule),
  ],
  controllers: [SentimentController],
  providers: [SentimentRepository, SentimentService],
<<<<<<< Updated upstream
  exports: [SentimentRepository],
=======
  exports: [SentimentRepository, SentimentService],
>>>>>>> Stashed changes
})
export class SentimentModule {}