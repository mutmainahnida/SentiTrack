import { Test, TestingModule } from '@nestjs/testing';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthService } from '../services/auth.service';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'register' | 'login' | 'refresh'>>;

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
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

  it('should delegate register() to authService.register() and return ApiResponse with null data', async () => {
    const registerDto: RegisterDto = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };
    const authResult = {
      user: { id: 'user_1', name: 'John Doe', email: 'john@example.com', createdAt: new Date('2026-04-15') },
      sessionId: 'session_1',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
    };
    authService.register.mockResolvedValue(authResult as any);

    const result = await controller.register(registerDto);

    expect(authService.register).toHaveBeenCalledWith(registerDto);
    expect(result.success).toBe(true);
    expect(result.message).toBe('successfully register');
    expect(result.data).toBeNull();
  });

  it('should delegate login() to authService.login() and return ApiResponse with TokenResponse', async () => {
    const loginDto: LoginDto = {
      email: 'john@example.com',
      password: 'password123',
    };
    const tokenResult = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
    };
    authService.login.mockResolvedValue(tokenResult as any);

    const result = await controller.login(loginDto);

    expect(authService.login).toHaveBeenCalledWith(loginDto);
    expect(result.success).toBe(true);
    expect(result.message).toBe('successfully login');
    expect(result.data).toEqual(tokenResult);
  });

  it('should delegate refresh() to authService.refresh() and return ApiResponse with TokenResponse', async () => {
    const refreshDto: RefreshTokenDto = { refreshToken: 'valid_refresh_token' };
    const tokenResult = {
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
    };
    authService.refresh.mockResolvedValue(tokenResult as any);

    const result = await controller.refresh(refreshDto);

    expect(authService.refresh).toHaveBeenCalledWith('valid_refresh_token');
    expect(result.success).toBe(true);
    expect(result.message).toBe('successfully refreshToken');
    expect(result.data).toEqual(tokenResult);
  });
});
