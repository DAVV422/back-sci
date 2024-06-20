import { Injectable, Logger } from '@nestjs/common';

import { handlerError } from '../common/utils/handlerError.utils';
import { ROLES } from '../common/constants';
import { CreateUserDto } from '../user/dto';
import { UserService } from '../user/services/user.service';

@Injectable()
export class SeedService {
  private readonly logger = new Logger('SeederService');

  constructor(private readonly userService: UserService) { }

  public async runSeeders() {
    if (process.env.APP_PROD == true) return { message: 'No se puede ejecutar seeders en producción' };
    try {
      const user: CreateUserDto = {
        name: 'diego',
        last_name: 'vargas',
        cellphone: '67303324',
        birthdate: new Date('2000-04-18'),
        grade: 'Bombero I 3er Año',
        email: 'diego@live.com',
        password: '123456789',
        role: ROLES.ADMIN,
      }
      await this.userService.createUser(user);
      return { message: 'Seeders ejecutados correctamente' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }
}
