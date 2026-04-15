import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { authConfig } from '../config/auth.config';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthRepository } from '../repositories/auth.repository';
import { TokenSessionService } from './token-session.service';

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  };
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

@Injectable()
export class AuthService {
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

    const passwordHash = await bcrypt.hash(
      dto.password,
      authConfig.bcryptSaltRounds,
    );

    const user = await this.authRepository.createUser({
      name: dto.name,
      email: normalizedEmail,
      passwordHash,
    });

    const now = new Date();
    const accessTokenExpiresAt = new Date(
      now.getTime() + authConfig.jwtAccessTtlSeconds * 1000,
    );
    const refreshTokenExpiresAt = new Date(
      now.getTime() + authConfig.jwtRefreshTtlSeconds * 1000,
    );

    const session = await this.authRepository.createSession({
      userId: user.id,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    });

    const accessToken = this.tokenSessionService.signAccessToken({
      sub: user.id,
      sessionId: session.id,
    });
    const refreshToken = this.tokenSessionService.signRefreshToken({
      sub: user.id,
      sessionId: session.id,
    });

    try {
      await this.tokenSessionService.storeTokensInRedis(
        session.id,
        accessToken,
        refreshToken,
      );
    } catch {
      await this.authRepository.deleteSession(session.id).catch(() => {});
      throw new InternalServerErrorException('Authentication failed');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      sessionId: session.id,
      accessToken,
      refreshToken,
      accessTokenExpiresIn: authConfig.jwtAccessTtlSeconds,
      refreshTokenExpiresIn: authConfig.jwtRefreshTtlSeconds,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.authRepository.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const now = new Date();
    const accessTokenExpiresAt = new Date(
      now.getTime() + authConfig.jwtAccessTtlSeconds * 1000,
    );
    const refreshTokenExpiresAt = new Date(
      now.getTime() + authConfig.jwtRefreshTtlSeconds * 1000,
    );

    const session = await this.authRepository.createSession({
      userId: user.id,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    });

    const accessToken = this.tokenSessionService.signAccessToken({
      sub: user.id,
      sessionId: session.id,
    });
    const refreshToken = this.tokenSessionService.signRefreshToken({
      sub: user.id,
      sessionId: session.id,
    });

    try {
      await this.tokenSessionService.storeTokensInRedis(
        session.id,
        accessToken,
        refreshToken,
      );
    } catch {
      await this.authRepository.deleteSession(session.id).catch(() => {});
      throw new InternalServerErrorException('Authentication failed');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      sessionId: session.id,
      accessToken,
      refreshToken,
      accessTokenExpiresIn: authConfig.jwtAccessTtlSeconds,
      refreshTokenExpiresIn: authConfig.jwtRefreshTtlSeconds,
    };
  }
}
