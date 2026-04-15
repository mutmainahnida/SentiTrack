import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenSessionService } from './token-session.service';

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

const redisMock = {
  multi: jest.fn(),
  setex: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  get: jest.fn(),
  exec: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn(() => redisMock);
});

describe('TokenSessionService', () => {
  let service: TokenSessionService;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  beforeEach(async () => {
    jwtService = {
      sign: jest.fn().mockReturnValue('mock_token'),
    };

    redisMock.multi.mockReset();
    redisMock.setex.mockReset();
    redisMock.set.mockReset();
    redisMock.del.mockReset();
    redisMock.get.mockReset();
    redisMock.exec.mockReset();
    redisMock.multi.mockReturnValue({
      setex: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenSessionService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<TokenSessionService>(TokenSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call jwtService.sign() with correct payload for access token', () => {
    const payload = { sub: 'user_1', sessionId: 'session_1' };

    service.signAccessToken(payload);

    expect(jwtService.sign).toHaveBeenCalledWith(payload, {
      secret: 'test-access-secret',
      expiresIn: 25200,
    });
  });

  it('should call jwtService.sign() with correct payload for refresh token', () => {
    const payload = { sub: 'user_1', sessionId: 'session_1' };

    service.signRefreshToken(payload);

    expect(jwtService.sign).toHaveBeenCalledWith(payload, {
      secret: 'test-refresh-secret',
      expiresIn: 2592000,
    });
  });

  it('should set Redis key with correct TTL', async () => {
    redisMock.setex.mockResolvedValue('OK');

    await service.storeTokensInRedis('session_1', 'access_token', 'refresh_token', 'user_1');

    expect(redisMock.setex).toHaveBeenCalledTimes(1);
    expect(redisMock.setex).toHaveBeenCalledWith(
      'auth:jwt:user:user_1',
      2592000,
      expect.any(String),
    );
  });

  it('should delete Redis key', async () => {
    redisMock.del.mockResolvedValue(1);

    await service.deleteTokensFromRedis('user_1');

    expect(redisMock.del).toHaveBeenCalledWith('auth:jwt:user:user_1');
  });

  it('should sign new tokens and store in Redis during rotation', async () => {
    redisMock.setex.mockResolvedValue('OK');

    const result = await service.rotateTokens('session_1', 'user_1');

    expect(jwtService.sign).toHaveBeenCalledTimes(2);
    expect(redisMock.setex).toHaveBeenCalledTimes(1);
    expect(result.accessToken).toBe('mock_token');
    expect(result.refreshToken).toBe('mock_token');
  });
});
