import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
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
    };
    return map[key];
  },
};

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<Pick<AuthRepository, 'findUserByEmail' | 'createUser'>>;
  let tokenSessionService: jest.Mocked<
    Pick<TokenSessionService, 'signAccessToken' | 'signRefreshToken' | 'verifyRefreshToken' | 'rotateTokens'>
  >;

  beforeEach(async () => {
    authRepository = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
    };
    tokenSessionService = {
      signAccessToken: jest.fn().mockReturnValue('mock_access_token'),
      signRefreshToken: jest.fn().mockReturnValue('mock_refresh_token'),
      verifyRefreshToken: jest.fn(),
      rotateTokens: jest.fn(),
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

    it('should create user, sign tokens, and return AuthResponse', async () => {
      const now = new Date();
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        roleId: 2,
        password: 'hash',
        createdAt: now,
        updatedAt: now,
      } as any;

      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createUser.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(authRepository.findUserByEmail).toHaveBeenCalledWith('john@example.com');
      expect(authRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'John Doe', email: 'john@example.com' }),
      );
      expect(tokenSessionService.signAccessToken).toHaveBeenCalledWith({ email: 'john@example.com', roleId: 2 });
      expect(tokenSessionService.signRefreshToken).toHaveBeenCalledWith({ email: 'john@example.com', roleId: 2 });
      
      expect(result).toMatchObject({
        user: { id: 'user_1', name: 'John Doe', email: 'john@example.com' },
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });
    });

    it('should throw ConflictException on duplicate email', async () => {
      authRepository.findUserByEmail.mockResolvedValue({
        id: 'existing_user',
        name: 'Existing',
        email: 'john@example.com',
        passwordHash: 'hash',
        roleId: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(ConflictException);
      expect(authRepository.createUser).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'password123',
    };

    it('should find user, compare password, and return TokenResponse', async () => {
      const now = new Date();
      const password = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        password,
        roleId: 2,
        createdAt: now,
        updatedAt: now,
      } as any;

      authRepository.findUserByEmail.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(authRepository.findUserByEmail).toHaveBeenCalledWith('john@example.com');
      expect(result).toMatchObject({
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
      });
    });

    it('should throw UnauthorizedException with generic message when user not found', async () => {
      authRepository.findUserByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('should throw UnauthorizedException with generic message when password is wrong', async () => {
      const password = await bcrypt.hash('correct_password', 10);
      authRepository.findUserByEmail.mockResolvedValue({
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        password,
        roleId: 2,
      } as any);

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should verify refresh token, rotate tokens, and return new TokenResponse', async () => {
      const mockPayload = { email: 'john@example.com', roleId: 2 };
      tokenSessionService.verifyRefreshToken.mockReturnValue(mockPayload);
      tokenSessionService.rotateTokens.mockReturnValue({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });

      const result = await service.refresh('valid_refresh_token');

      expect(tokenSessionService.verifyRefreshToken).toHaveBeenCalledWith('valid_refresh_token');
      expect(tokenSessionService.rotateTokens).toHaveBeenCalledWith('john@example.com', 2);
      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        accessTokenExpiresIn: 25200,
        refreshTokenExpiresIn: 2592000,
      });
    });
  });
});
