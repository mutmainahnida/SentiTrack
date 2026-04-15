import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthRepository } from '../repositories/auth.repository';
import { TokenSessionService } from './token-session.service';
import { TokenResponse } from '../types/auth-response.type';
import { AuthResponse } from '../types/auth-response.type';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly tokenSessionService: TokenSessionService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.authRepository.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

    const user = await this.authRepository.createUser({
      name: dto.name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const sessionId = randomUUID();
    const accessToken = this.tokenSessionService.signAccessToken({
      sub: user.id,
      sessionId,
    });
    const refreshToken = this.tokenSessionService.signRefreshToken({
      sub: user.id,
      sessionId,
    });

    try {
      await this.tokenSessionService.storeTokensInRedis(
        sessionId,
        accessToken,
        refreshToken,
        user.id,
      );
    } catch {
      throw new InternalServerErrorException('Authentication failed');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      sessionId,
      accessToken,
      refreshToken,
      accessTokenExpiresIn: 25200,
      refreshTokenExpiresIn: 2592000,
    };
  }

  async login(dto: LoginDto): Promise<TokenResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.authRepository.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const sessionId = randomUUID();
    const accessToken = this.tokenSessionService.signAccessToken({
      sub: user.id,
      sessionId,
    });
    const refreshToken = this.tokenSessionService.signRefreshToken({
      sub: user.id,
      sessionId,
    });

    try {
      await this.tokenSessionService.storeTokensInRedis(
        sessionId,
        accessToken,
        refreshToken,
        user.id,
      );
    } catch {
      throw new InternalServerErrorException('Authentication failed');
    }

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: 25200,
      refreshTokenExpiresIn: 2592000,
    };
  }

  async refresh(refreshToken: string): Promise<TokenResponse> {
    let payload: { sub: string; sessionId: string };

    try {
      payload = await this.tokenSessionService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid JWT signature or expired');
    }

    const isValidInRedis = await this.tokenSessionService.validateRefreshTokenAgainstRedis(
      payload.sub,
      refreshToken,
    );

    if (!isValidInRedis) {
      await this.tokenSessionService.deleteTokensFromRedis(payload.sub);
      throw new UnauthorizedException('Invalid Token');
    }

    try {
      const tokens = await this.tokenSessionService.rotateTokens(
        payload.sessionId,
        payload.sub,
      );
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresIn: 25200,
        refreshTokenExpiresIn: 2592000,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to rotate tokens');
    }
  }
}
