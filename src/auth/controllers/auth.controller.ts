import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger/dist/decorators';
import { Throttle } from '@nestjs/throttler';
import { authThrottleLimit } from '../../common/constants';

import { AuthDTO } from '../dto/auth.dto';
import { RefreshTokenDTO } from '../dto/refresh-token.dto';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from 'src/common/interfaces/responseMessage.interface';
import { UserService } from '../../user/services/user.service';
import { ILoginResponse } from '../interfaces/login.interface';

import { ActivateAccountDto } from '../dto/activate-account.dto';
import { ForgotPasswordDto, ResetPasswordDto } from '../dto/password-recovery.dto';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  // @Post('register')
  // public async register(@Body() createUserDto: CreateUserDto): Promise<ResponseMessage> {
  //   return {
  //     statusCode: 200,
  //     data: await this.userService.createUser(createUserDto),
  //   };
  // }

  @Throttle({ short: { ttl: 60000, limit: authThrottleLimit(5) } }) // 5 intentos/min
  @Post('login')
  public async login(
    @Body() authDto: AuthDTO,
  ): Promise<ApiResponse<ILoginResponse>> {
    const { email, password } = authDto;
    return {
      success: true,
      statusCode: 200,
      data: await this.authService.login(email, password),
    };
  }

  @Throttle({ short: { ttl: 60000, limit: authThrottleLimit(10) } })
  @Post('activate')
  public async activateAccount(
    @Body() activateDto: ActivateAccountDto,
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.authService.activateAccount(
      activateDto.token,
      activateDto.password,
    );
    return {
      success: true,
      statusCode: 200,
      message: result.message,
      data: result,
    };
  }

  @Throttle({ short: { ttl: 60000, limit: authThrottleLimit(3) } })
  @HttpCode(200)
  @Post('forgot-password')
  public async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ApiResponse<{ message: string }>> {
    const result = await this.authService.requestPasswordReset(dto.email);
    return { success: true, statusCode: 200, message: result.message, data: result };
  }

  @Throttle({ short: { ttl: 60000, limit: authThrottleLimit(10) } })
  @HttpCode(200)
  @Post('reset-password')
  public async resetPassword(@Body() dto: ResetPasswordDto): Promise<ApiResponse<{ message: string }>> {
    const result = await this.authService.resetPassword(dto.token, dto.password);
    return { success: true, statusCode: 200, message: result.message, data: result };
  }

  @Throttle({ short: { ttl: 60000, limit: authThrottleLimit(10) } }) // 10 intentos/min
  @Post('refresh-token')
  public async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDTO,
  ): Promise<ApiResponse<ILoginResponse>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.authService.refreshToken(refreshTokenDto.refreshToken),
    };
  }
}
