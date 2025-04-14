import { Injectable, Logger } from '@nestjs/common';
import { NotFoundException, } from '@nestjs/common/exceptions';
import * as bcrypt from 'bcrypt';

import { UserEntity } from '../../user/entities/user.entity';
import { UserService } from '../../user/services/user.service';
import { IPayload } from '../interfaces/payload.interface';
import { ILoginResponse } from '../interfaces/login.interface';
import { handlerError } from '../../common/utils/handlerError.utils';
import { TokenValidatorService } from './token-validator.service';
import { JwtServiceAdapter } from './jwt.service';
import { UserDTO } from '../../user/dto/user.dto';
import { IUserToken } from '../interfaces/userToken.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly tokenValidator: TokenValidatorService,
    private readonly jwtService: JwtServiceAdapter
  ) {}

  async login(email: string, password: string): Promise<ILoginResponse> {
    try {
      const user = await this.userService.findByEmail(email);
      if (!user) throw new NotFoundException('Usuario o contraseña incorrecta.');
      if (user.is_deleted) throw new NotFoundException('Ocurrió un problema.');
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new NotFoundException('Usuario o contraseña incorrecta.');

      return this.generateJWT(user);
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async checkToken(token: string): Promise<IUserToken | false> {
    try {
      const userToken = await this.tokenValidator.validateToken(token);
      if (!userToken) return false;
      return userToken;
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async generateJWT(user: UserEntity): Promise<ILoginResponse> {
    const payload = this.getPayload(user);
    const accessToken = this.jwtService.signToken(payload);
    const userData = new UserDTO(user);
    return { accessToken, user: userData };
  }

  async recoverPassword(email: string): Promise<{ accessToken: string }> {
    const user = await this.userService.findByEmail(email);
    const payload = this.getPayload(user);
    const accessToken = this.jwtService.signToken(payload);
    return { accessToken };
  }

  private getPayload(user: UserEntity): IPayload {
    return { sub: user.id, role: user.role };
  }
}