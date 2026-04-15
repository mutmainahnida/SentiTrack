import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

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

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    const host = config.get<string>('REDIS_HOST') ?? 'localhost';
    const port = parseInt(config.get<string>('REDIS_PORT') ?? '6379', 10);
    this.redis = new Redis({ host, port });
  }

  signAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? '',
      expiresIn: 25200,
    });
  }

  signRefreshToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? '',
      expiresIn: 2592000,
    });
  }

  async storeTokensInRedis(
    sessionId: string,
    accessToken: string,
    refreshToken: string,
    userId: string,
  ): Promise<void> {
    const redisKey = `auth:jwt:user:${userId}`;
    const sessionData = {
      userId,
      sessionId,
      accessToken,
      refreshToken,
    };

    // Store up to the refresh token expiry (30 days)
    await this.redis.setex(redisKey, 2592000, JSON.stringify(sessionData));
  }

  async deleteTokensFromRedis(userId: string): Promise<void> {
    const redisKey = `auth:jwt:user:${userId}`;
    await this.redis.del(redisKey);
  }

  async validateRefreshTokenAgainstRedis(userId: string, incomingToken: string): Promise<boolean> {
    const redisKey = `auth:jwt:user:${userId}`;
    const storedData = await this.redis.get(redisKey);
    
    if (!storedData) return false;

    try {
      const sessionData = JSON.parse(storedData);
      return sessionData.refreshToken === incomingToken;
    } catch {
      return false;
    }
  }

  async verifyRefreshToken(refreshToken: string): Promise<TokenPayload> {
    return this.jwtService.verify<TokenPayload>(refreshToken, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? '',
    });
  }

  async rotateTokens(
    sessionId: string,
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.signAccessToken({ sub: userId, sessionId });
    const newRefreshToken = this.signRefreshToken({ sub: userId, sessionId });

    await this.storeTokensInRedis(sessionId, accessToken, newRefreshToken, userId);

    return { accessToken, refreshToken: newRefreshToken };
  }
}