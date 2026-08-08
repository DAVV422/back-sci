import { Body, Controller, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger/dist/decorators';
import { Throttle } from '@nestjs/throttler';

import { AuthDTO } from '../dto/auth.dto';
import { RefreshTokenDTO } from '../dto/refresh-token.dto';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from 'src/common/interfaces/responseMessage.interface';
import { UserService } from '../../user/services/user.service';
import { ILoginResponse } from '../interfaces/login.interface';
import { IUserToken } from '../interfaces/userToken.interface';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  // @Post('register')
  // public async register(@Body() createUserDto: CreateUserDto): Promise<ResponseMessage> {
  //   console.log(createUserDto);
  //   return {
  //     statusCode: 200,
  //     data: await this.userService.createUser(createUserDto),
  //   };
  // }

  @Throttle({ short: { ttl: 60000, limit: 5 } }) // 5 intentos/min
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

  @Throttle({ short: { ttl: 60000, limit: 10 } }) // 10 intentos/min
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

  @ApiQuery({ name: 'token', type: 'string', required: true })
  @Post('checkToken')
  public async checkToken(
    @Query('token') token: string,
  ): Promise<ApiResponse<IUserToken | false>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.authService.checkToken(token),
    };
  }

  @ApiQuery({ name: 'token', type: 'string', required: true })
  @Post('expiredToken')
  public async expiredToken(
    @Query('token') token: string,
  ): Promise<ApiResponse<boolean>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.authService.expiredToken(token),
    };
  }

  // recover password
  // @Post('recover')
  // public async recover(@Body() { username }) {
  // return await this.authService.recoverPassword(username);
  // }
}
