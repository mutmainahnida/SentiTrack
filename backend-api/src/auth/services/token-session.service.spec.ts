import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TokenSessionService } from './token-session.service';

const redisMock = {
  multi: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
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
    redisMock.del.mockReset();
    redisMock.exec.mockReset();
    redisMock.multi.mockReturnValue({
      setex: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenSessionService,
        { provide: JwtService, useValue: jwtService },
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
      secret: expect.any(String),
      expiresIn: 25200,
    });
  });

  it('should call jwtService.sign() with correct payload for refresh token', () => {
    const payload = { sub: 'user_1', sessionId: 'session_1' };

    service.signRefreshToken(payload);

    expect(jwtService.sign).toHaveBeenCalledWith(payload, {
      secret: expect.any(String),
      expiresIn: 2592000,
    });
  });

  it('should set both Redis keys with correct TTLs', async () => {
    const multiChain = {
      setex: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    redisMock.multi.mockReturnValue(multiChain);

    await service.storeTokensInRedis('session_1', 'access_token', 'refresh_token');

    expect(redisMock.multi).toHaveBeenCalled();
    expect(multiChain.setex).toHaveBeenCalledTimes(2);

    const accessKey = 'auth:session:session_1:access';
    const refreshKey = 'auth:session:session_1:refresh';

    const setexCalls = multiChain.setex.mock.calls;

    const [accessKeyArg, accessTtlArg, accessValueArg] = setexCalls[0];
    expect(accessKeyArg).toBe(accessKey);
    expect(accessTtlArg).toBe(25200);
    expect(JSON.parse(accessValueArg as string)).toMatchObject({
      sessionId: 'session_1',
      token: 'access_token',
      type: 'access',
    });

    const [refreshKeyArg, refreshTtlArg, refreshValueArg] = setexCalls[1];
    expect(refreshKeyArg).toBe(refreshKey);
    expect(refreshTtlArg).toBe(2592000);
    expect(JSON.parse(refreshValueArg as string)).toMatchObject({
      sessionId: 'session_1',
      token: 'refresh_token',
      type: 'refresh',
    });

    expect(multiChain.exec).toHaveBeenCalled();
  });

  it('should delete both Redis keys', async () => {
    redisMock.del.mockResolvedValue(2);

    await service.deleteTokensFromRedis('session_1');

    expect(redisMock.del).toHaveBeenCalledWith(
      'auth:session:session_1:access',
      'auth:session:session_1:refresh',
    );
  });
});
