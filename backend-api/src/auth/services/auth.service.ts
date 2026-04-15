import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthRepository } from '../repositories/auth.repository';
import { TokenSessionService, TokenPayload } from './token-session.service';
import { TokenResponse, AuthResponse } from '../types/auth-response.type';

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

    const payload: TokenPayload = { email: user.email, roleId: user.roleId };
    const accessToken = this.tokenSessionService.signAccessToken(payload);
    const refreshToken = this.tokenSessionService.signRefreshToken(payload);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
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

    const payload: TokenPayload = { email: user.email, roleId: user.roleId };
    const accessToken = this.tokenSessionService.signAccessToken(payload);
    const refreshToken = this.tokenSessionService.signRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: 25200,
      refreshTokenExpiresIn: 2592000,
    };
  }

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const payload = this.tokenSessionService.verifyRefreshToken(refreshToken);
    const tokens = this.tokenSessionService.rotateTokens(payload.email, payload.roleId);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresIn: 25200,
      refreshTokenExpiresIn: 2592000,
    };
  }
}
