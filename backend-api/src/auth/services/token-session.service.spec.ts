import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TokenSessionService } from './token-session.service';

const mockConfig = {
  get: (key: string) => {
    const map: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    };
    return map[key];
  },
};

describe('TokenSessionService', () => {
  let service: TokenSessionService;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign' | 'verify'>>;

  beforeEach(async () => {
    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenSessionService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<TokenSessionService>(TokenSessionService);
  });

  describe('signAccessToken', () => {
    it('should sign payload with access secret', () => {
      jwtService.sign.mockReturnValue('access_token');
      const payload = { email: 'test@example.com', roleId: 1 };

      const result = service.signAccessToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(payload, {
        secret: 'test-access-secret',
        expiresIn: '7d',
      });
      expect(result).toBe('access_token');
    });
  });

  describe('signRefreshToken', () => {
    it('should sign payload with refresh secret', () => {
      jwtService.sign.mockReturnValue('refresh_token');
      const payload = { email: 'test@example.com', roleId: 1 };

      const result = service.signRefreshToken(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(payload, {
        secret: 'test-refresh-secret',
        expiresIn: '30d',
      });
      expect(result).toBe('refresh_token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and return payload', () => {
      const payload = { email: 'test@example.com', roleId: 1 };
      jwtService.verify.mockReturnValue(payload);

      const result = service.verifyRefreshToken('refresh_token');

      expect(jwtService.verify).toHaveBeenCalledWith('refresh_token', {
        secret: 'test-refresh-secret',
      });
      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException on invalid token', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      expect(() => service.verifyRefreshToken('invalid')).toThrow(UnauthorizedException);
    });
  });

  describe('rotateTokens', () => {
    it('should generate new access and refresh tokens', () => {
      jwtService.sign.mockImplementation((payload, opt: any) => {
        return opt.expiresIn === '7d' ? 'new_access' : 'new_refresh';
      });

      const result = service.rotateTokens('test@example.com', 1);

      expect(result).toEqual({
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
      });
    });
  });
});
