import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface TokenPayload {
  email: string;
  roleId: number;
}

@Injectable()
export class TokenSessionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? '',
      expiresIn: '7d',
    });
  }

  signRefreshToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? '',
      expiresIn: '30d',
    });
  }

  verifyRefreshToken(refreshToken: string): TokenPayload {
    try {
      return this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? '',
      });
    } catch {
      throw new UnauthorizedException('Invalid JWT signature or expired');
    }
  }

  rotateTokens(email: string, roleId: number): { accessToken: string; refreshToken: string } {
    const payload = { email, roleId };
    const accessToken = this.signAccessToken(payload);
    const refreshToken = this.signRefreshToken(payload);

    return { accessToken, refreshToken };
  }
}