import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthService } from '../services/auth.service';
import { ApiResponse, ApiResponseFactory } from '../../common/api-response.util';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<ApiResponse> {
    await this.authService.register(dto);
    return ApiResponseFactory.success('successfully register', null);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<ApiResponse> {
    const result = await this.authService.login(dto);
    return ApiResponseFactory.success('successfully login', {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<ApiResponse> {
    const result = await this.authService.refresh(dto.refreshToken);
    return ApiResponseFactory.success('successfully refreshToken', {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }
}