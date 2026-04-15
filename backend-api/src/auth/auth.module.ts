import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controllers/auth.controller';
import { authConfig } from './config/auth.config';
import { AuthRepository } from './repositories/auth.repository';
import { AuthService } from './services/auth.service';
import { TokenSessionService } from './services/token-session.service';

@Module({
  imports: [
    JwtModule.register({
      secret: authConfig.jwtAccessSecret,
      signOptions: { expiresIn: authConfig.jwtAccessTtlSeconds },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, TokenSessionService],
  exports: [AuthService, TokenSessionService],
})
export class AuthModule {}
