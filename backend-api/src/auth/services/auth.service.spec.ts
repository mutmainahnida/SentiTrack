import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthRepository } from '../repositories/auth.repository';
import { TokenSessionService } from './token-session.service';
import { AuthService } from './auth.service';

const mockConfig = {
  get: (key: string) => {
    const map: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
    };
    return map[key];
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<Pick<AuthRepository, 'findUserByEmail' | 'createUser'>>;
  let tokenSessionService: jest.Mocked<
    Pick<TokenSessionService, 'signAccessToken' | 'signRefreshToken' | 'storeTokensInRedis' | 'verifyRefreshToken' | 'rotateTokens' | 'deleteTokensFromRedis' | 'validateRefreshTokenAgainstRedis'>
  >;

  beforeEach(async () => {
    authRepository = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
    };
    tokenSessionService = {
      signAccessToken: jest.fn().mockReturnValue('mock_access_token'),
      signRefreshToken: jest.fn().mockReturnValue('mock_refresh_token'),
      storeTokensInRedis: jest.fn(),
      verifyRefreshToken: jest.fn(),
      rotateTokens: jest.fn(),
      deleteTokensFromRedis: jest.fn(),
      validateRefreshTokenAgainstRedis: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepository },
        { provide: TokenSessionService, useValue: tokenSessionService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    it('should create user, sign tokens, store in Redis, and return AuthResponse', async () => {
      const now = new Date();
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hash',
        createdAt: now,
        updatedAt: now,
      } as any;

      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createUser.mockResolvedValue(mockUser);
      tokenSessionService.storeTokensInRedis.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(authRepository.findUserByEmail).toHaveBeenCalledWith('john@example.com');
      expect(authRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'John Doe', email: 'john@example.com' }),
      );
      expect(tokenSessionService.signAccessToken).toHaveBeenCalled();
      expect(tokenSessionService.signRefreshToken).toHaveBeenCalled();
      expect(tokenSessionService.storeTokensInRedis).toHaveBeenCalled();
      expect(result).toMatchObject({
        user: { id: 'user_1', name: 'John Doe', email: 'john@example.com' },
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        accessTokenExpiresIn: 25200,
        refreshTokenExpiresIn: 2592000,
      });
      expect(result.sessionId).toBeDefined();
    });

    it('should throw ConflictException on duplicate email', async () => {
      authRepository.findUserByEmail.mockResolvedValue({
        id: 'existing_user',
        name: 'Existing',
        email: 'john@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(ConflictException);
      expect(authRepository.createUser).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on Redis failure', async () => {
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createUser.mockResolvedValue(mockUser);
      tokenSessionService.storeTokensInRedis.mockRejectedValue(new Error('Redis unavailable'));

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'password123',
    };

    it('should find user, compare password, store tokens, and return TokenResponse', async () => {
      const now = new Date();
      const password = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        password,
        createdAt: now,
        updatedAt: now,
      } as any;

      authRepository.findUserByEmail.mockResolvedValue(mockUser);
      tokenSessionService.storeTokensInRedis.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(authRepository.findUserByEmail).toHaveBeenCalledWith('john@example.com');
      expect(result).toMatchObject({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        accessTokenExpiresIn: 25200,
        refreshTokenExpiresIn: 2592000,
      });
    });

    it('should throw UnauthorizedException with generic message when user not found', async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedException);
      const error = await service.login(loginDto).catch((e) => e);
      expect((error as UnauthorizedException).message).toBe('Invalid email or password');
    });

    it('should throw UnauthorizedException with generic message when password is wrong', async () => {
      const password = await bcrypt.hash('correct_password', 10);
      authRepository.findUserByEmail.mockResolvedValue({
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        password,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedException);
      const error = await service.login(loginDto).catch((e) => e);
      expect((error as UnauthorizedException).message).toBe('Invalid email or password');
    });

    it('should throw InternalServerErrorException on Redis failure', async () => {
      const now = new Date();
      const password = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        password,
        createdAt: now,
        updatedAt: now,
      } as any;

      authRepository.findUserByEmail.mockResolvedValue(mockUser);
      tokenSessionService.storeTokensInRedis.mockRejectedValue(new Error('Redis unavailable'));

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('should use same error message for login failure as register failure', async () => {
      authRepository.findUserByEmail.mockResolvedValue({
        id: 'existing_user',
        name: 'Existing',
        email: 'john@example.com',
        password: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const loginError = await service.login(loginDto).catch((e) => e);
      const registerError = await service.register({
        name: 'John',
        email: 'john@example.com',
        password: 'password123',
      }).catch((e) => e);

      expect((loginError as UnauthorizedException).message).toBe('Invalid email or password');
      expect((registerError as ConflictException).message).toBe('Email already registered');
      expect((loginError as UnauthorizedException).message).not.toBe('Email already registered');
    });
  });

  describe('refresh', () => {
    it('should verify refresh token, rotate tokens, and return new TokenResponse', async () => {
      const mockPayload = { sub: 'user_1', sessionId: 'session_1' };
      tokenSessionService.verifyRefreshToken.mockResolvedValue(mockPayload as any);
      tokenSessionService.validateRefreshTokenAgainstRedis.mockResolvedValue(true);
      tokenSessionService.rotateTokens.mockResolvedValue({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });

      const result = await service.refresh('valid_refresh_token');

      expect(tokenSessionService.verifyRefreshToken).toHaveBeenCalledWith('valid_refresh_token');
      expect(tokenSessionService.validateRefreshTokenAgainstRedis).toHaveBeenCalledWith('user_1', 'valid_refresh_token');
      expect(tokenSessionService.rotateTokens).toHaveBeenCalledWith('session_1', 'user_1');
      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        accessTokenExpiresIn: 25200,
        refreshTokenExpiresIn: 2592000,
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      tokenSessionService.verifyRefreshToken.mockRejectedValue(new Error('invalid token'));

      await expect(service.refresh('invalid_token')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(tokenSessionService.rotateTokens).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when rotateTokens fails', async () => {
      const mockPayload = { sub: 'user_1', sessionId: 'session_1' };
      tokenSessionService.verifyRefreshToken.mockResolvedValue(mockPayload as any);
      tokenSessionService.validateRefreshTokenAgainstRedis.mockResolvedValue(true);
      tokenSessionService.rotateTokens.mockRejectedValue(new UnauthorizedException('Session not found'));

      await expect(service.refresh('valid_refresh_token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw InternalServerErrorException on unexpected rotateTokens error', async () => {
      const mockPayload = { sub: 'user_1', sessionId: 'session_1' };
      tokenSessionService.verifyRefreshToken.mockResolvedValue(mockPayload as any);
      tokenSessionService.validateRefreshTokenAgainstRedis.mockResolvedValue(true);
      tokenSessionService.rotateTokens.mockRejectedValue(new Error('redis error'));

      await expect(service.refresh('valid_refresh_token')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });
});
