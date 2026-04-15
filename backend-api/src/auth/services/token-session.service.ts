import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { authConfig } from '../config/auth.config';

interface TokenPayload {
  sub: string;
  sessionId: string;
}

interface TokenCacheEntry {
  userId: string;
  sessionId: string;
  token: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class TokenSessionService {
  private readonly redis: Redis;

  constructor(private readonly jwtService: JwtService) {
    const host = process.env['REDIS_HOST'] ?? 'localhost';
    const port = parseInt(process.env['REDIS_PORT'] ?? '6379', 10);
    this.redis = new Redis({ host, port });
  }

  signAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: authConfig.jwtAccessSecret,
      expiresIn: authConfig.jwtAccessTtlSeconds,
    });
  }

  signRefreshToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: authConfig.jwtRefreshSecret,
      expiresIn: authConfig.jwtRefreshTtlSeconds,
    });
  }

  async storeTokensInRedis(
    sessionId: string,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    const accessKey = `auth:session:${sessionId}:access`;
    const refreshKey = `auth:session:${sessionId}:refresh`;

    const accessEntry: TokenCacheEntry = {
      userId: '',
      sessionId,
      token: accessToken,
      type: 'access',
    };
    const refreshEntry: TokenCacheEntry = {
      userId: '',
      sessionId,
      token: refreshToken,
      type: 'refresh',
    };

    await this.redis
      .multi()
      .setex(accessKey, authConfig.jwtAccessTtlSeconds, JSON.stringify(accessEntry))
      .setex(refreshKey, authConfig.jwtRefreshTtlSeconds, JSON.stringify(refreshEntry))
      .exec();
  }

  async deleteTokensFromRedis(sessionId: string): Promise<void> {
    const accessKey = `auth:session:${sessionId}:access`;
    const refreshKey = `auth:session:${sessionId}:refresh`;

    await this.redis.del(accessKey, refreshKey);
  }
}
