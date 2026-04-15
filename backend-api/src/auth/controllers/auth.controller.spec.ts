import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthService } from '../services/auth.service';
import { AuthController } from './auth.controller';
import { AuthResponse } from '../types/auth-response.type';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'register' | 'login'>>;

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate register() to authService.register() with correct dto', async () => {
    const registerDto: RegisterDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };
    const authResponse: AuthResponse = {
      user: {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date('2026-04-15'),
      },
      sessionId: 'session_1',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      accessTokenExpiresIn: 25200,
      refreshTokenExpiresIn: 2592000,
    };
    authService.register.mockResolvedValue(authResponse);

    const result = await controller.register(registerDto);

    expect(authService.register).toHaveBeenCalledWith(registerDto);
    expect(result).toEqual(authResponse);
  });

  it('should delegate login() to authService.login() with correct dto', async () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'password123',
    };
    const authResponse: AuthResponse = {
      user: {
        id: 'user_1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date('2026-04-15'),
      },
      sessionId: 'session_1',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      accessTokenExpiresIn: 25200,
      refreshTokenExpiresIn: 2592000,
    };
    authService.login.mockResolvedValue(authResponse);

    const result = await controller.login(loginDto);

    expect(authService.login).toHaveBeenCalledWith(loginDto);
    expect(result).toEqual(authResponse);
  });
});
