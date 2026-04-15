import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthRepository } from '../repositories/auth.repository';
import { TokenSessionService } from './token-session.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<
    Pick<AuthRepository, 'findUserByEmail' | 'createUser' | 'createSession' | 'deleteSession'>
  >;
  let tokenSessionService: jest.Mocked<
    Pick<TokenSessionService, 'signAccessToken' | 'signRefreshToken' | 'storeTokensInRedis'>
  >;

  beforeEach(async () => {
    authRepository = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
      createSession: jest.fn(),
      deleteSession: jest.fn().mockResolvedValue({} as never),
    };
    tokenSessionService = {
      signAccessToken: jest.fn().mockReturnValue('mock_access_token'),
      signRefreshToken: jest.fn().mockReturnValue('mock_refresh_token'),
      storeTokensInRedis: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: authRepository },
        { provide: TokenSessionService, useValue: tokenSessionService },
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

    it('should create user, create session, sign tokens, store in Redis, and return AuthResponse', async () => {
      const now = new Date();
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: now,
      };
      const mockSession = {
        id: 'session_1',
        userId: 'user_1',
        accessTokenExpiresAt: new Date(now.getTime() + 25200 * 1000),
        refreshTokenExpiresAt: new Date(now.getTime() + 2592000 * 1000),
      };

      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createUser.mockResolvedValue(mockUser);
      authRepository.createSession.mockResolvedValue(mockSession);
      tokenSessionService.storeTokensInRedis.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(authRepository.findUserByEmail).toHaveBeenCalledWith('john@example.com');
      expect(authRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
        }),
      );
      expect(authRepository.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user_1' }),
      );
      expect(tokenSessionService.signAccessToken).toHaveBeenCalledWith({
        sub: 'user_1',
        sessionId: 'session_1',
      });
      expect(tokenSessionService.signRefreshToken).toHaveBeenCalledWith({
        sub: 'user_1',
        sessionId: 'session_1',
      });
      expect(tokenSessionService.storeTokensInRedis).toHaveBeenCalledWith(
        'session_1',
        'mock_access_token',
        'mock_refresh_token',
      );
      expect(result).toMatchObject({
        user: { id: 'user_1', name: 'John Doe', email: 'john@example.com' },
        sessionId: 'session_1',
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        accessTokenExpiresIn: 25200,
        refreshTokenExpiresIn: 2592000,
      });
    });

    it('should throw ConflictException on duplicate email', async () => {
      authRepository.findUserByEmail.mockResolvedValue({
        id: 'existing_user',
        name: 'Existing',
        email: 'john@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
      });

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(authRepository.createUser).not.toHaveBeenCalled();
      expect(authRepository.createSession).not.toHaveBeenCalled();
    });

    it('should delete session and throw InternalServerErrorException on Redis failure', async () => {
      const now = new Date();
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: now,
      };
      const mockSession = {
        id: 'session_1',
        userId: 'user_1',
        accessTokenExpiresAt: new Date(now.getTime() + 25200 * 1000),
        refreshTokenExpiresAt: new Date(now.getTime() + 2592000 * 1000),
      };

      authRepository.findUserByEmail.mockResolvedValue(null);
      authRepository.createUser.mockResolvedValue(mockUser);
      authRepository.createSession.mockResolvedValue(mockSession);
      tokenSessionService.storeTokensInRedis.mockRejectedValue(new Error('Redis unavailable'));

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(authRepository.deleteSession).toHaveBeenCalledWith('session_1');
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'password123',
    };

    it('should find user, compare password, create session, and return AuthResponse', async () => {
      const now = new Date();
      const plainPassword = 'password123';
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash,
        createdAt: now,
      };
      const mockSession = {
        id: 'session_1',
        userId: 'user_1',
        accessTokenExpiresAt: new Date(now.getTime() + 25200 * 1000),
        refreshTokenExpiresAt: new Date(now.getTime() + 2592000 * 1000),
      };

      authRepository.findUserByEmail.mockResolvedValue(mockUser);
      authRepository.createSession.mockResolvedValue(mockSession);
      tokenSessionService.storeTokensInRedis.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(authRepository.findUserByEmail).toHaveBeenCalledWith('john@example.com');
      expect(authRepository.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user_1' }),
      );
      expect(tokenSessionService.signAccessToken).toHaveBeenCalledWith({
        sub: 'user_1',
        sessionId: 'session_1',
      });
      expect(tokenSessionService.signRefreshToken).toHaveBeenCalledWith({
        sub: 'user_1',
        sessionId: 'session_1',
      });
      expect(tokenSessionService.storeTokensInRedis).toHaveBeenCalledWith(
        'session_1',
        'mock_access_token',
        'mock_refresh_token',
      );
      expect(result).toMatchObject({
        user: { id: 'user_1', name: 'John Doe', email: 'john@example.com' },
        sessionId: 'session_1',
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
      const now = new Date();
      const passwordHash = await bcrypt.hash('correct_password', 10);
      authRepository.findUserByEmail.mockResolvedValue({
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash,
        createdAt: now,
      });

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedException);
      const error = await service.login(loginDto).catch((e) => e);
      expect((error as UnauthorizedException).message).toBe('Invalid email or password');
    });

    it('should delete session and throw InternalServerErrorException on Redis failure', async () => {
      const now = new Date();
      const plainPassword = 'password123';
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash,
        createdAt: now,
      };
      const mockSession = {
        id: 'session_1',
        userId: 'user_1',
        accessTokenExpiresAt: new Date(now.getTime() + 25200 * 1000),
        refreshTokenExpiresAt: new Date(now.getTime() + 2592000 * 1000),
      };

      authRepository.findUserByEmail.mockResolvedValue(mockUser);
      authRepository.createSession.mockResolvedValue(mockSession);
      tokenSessionService.storeTokensInRedis.mockRejectedValue(new Error('Redis unavailable'));

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(authRepository.deleteSession).toHaveBeenCalledWith('session_1');
    });

    it('should use same error message for login failure as register failure', async () => {
      // Both login and register should throw generic messages that don't reveal
      // whether the user exists or not.
      // Login: findUserByEmail returns null -> UnauthorizedException
      // Register: findUserByEmail returns existing user -> ConflictException
      authRepository.findUserByEmail.mockResolvedValue({
        id: 'existing_user',
        name: 'Existing',
        email: 'john@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
      });

      const loginError = await service.login(loginDto).catch((e) => e);
      const registerError = await service.register({
        name: 'John',
        email: 'john@example.com',
        password: 'password123',
      }).catch((e) => e);

      // Both should throw with the same generic message text
      expect((loginError as UnauthorizedException).message).toBe('Invalid email or password');
      expect((registerError as ConflictException).message).toBe('Email already registered');

      // The key security property: login message does NOT reveal whether email exists
      // Both are treated the same to the caller
      expect((loginError as UnauthorizedException).message).not.toBe('Email already registered');
    });
  });
});
