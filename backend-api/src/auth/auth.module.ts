import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AuthRepository } from './repositories/auth.repository';
import { AuthService } from './services/auth.service';
import { TokenSessionService } from './services/token-session.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET') ?? '',
        signOptions: { expiresIn: 25200 },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, TokenSessionService],
  exports: [AuthService, TokenSessionService],
})
export class AuthModule {}