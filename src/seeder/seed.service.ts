import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { handlerError } from '../common/utils/handlerError.utils';
import { ROLES } from '../common/constants';
import { CreateUserDto } from '../user/dto';
import { UserService } from '../user/services/user.service';
import { ChargeCatalogService } from '../sci_module/charges/services/charge-catalog.service';

@Injectable()
export class SeedService {
  private readonly logger = new Logger('SeederService');

  constructor(
    private readonly userService: UserService,
    private readonly chargeCatalogService: ChargeCatalogService,
    private readonly configService: ConfigService,
  ) { }

  public async runAllSeeders() {
    if (process.env.APP_PROD === 'true') {
      return { message: 'No se puede ejecutar seeders en producción' };
    }

    try {
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
      const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');
      if (!adminEmail || !adminPassword) {
        throw new BadRequestException(
          'Variables de entorno ADMIN_EMAIL y ADMIN_PASSWORD son requeridas para el seeder',
        );
      }

      let existingUser = null;
      try {
        existingUser = await this.userService.findByEmail(adminEmail);
      } catch (error) {
        existingUser = null;
      }

      if (!existingUser) {
        const user: CreateUserDto = {
          name: this.configService.get<string>('ADMIN_NAME') ?? 'Administrador',
          lastName:
            this.configService.get<string>('ADMIN_LAST_NAME') ?? 'Sistema',
          cellphone: '00000000',
          grade: 'Administrador del Sistema',
          birthdate: new Date('2000-01-01'),
          email: adminEmail,
          password: adminPassword,
          role: ROLES.SUADMIN,
          isActive: true,
        };

        // El seeder actúa como el propio sistema: createUser solo permite crear un
        // suadmin a otro suadmin, y en una base vacía todavía no existe ninguno.
        await this.userService.createUser(user, ROLES.SUADMIN);
        this.logger.log(`Usuario Super Admin (suadmin) creado exitosamente y activo: ${adminEmail}`);
      } else {
        const updates: any = {
          password: adminPassword,
        };
        if (existingUser.role !== ROLES.SUADMIN) {
          updates.role = ROLES.SUADMIN;
        }
        if (!existingUser.isActive) {
          updates.isActive = true;
        }
        await this.userService.update(existingUser.id, updates);
        this.logger.log(`Usuario Super Admin ${adminEmail} sincronizado (rol, estado activo y contraseña de .env).`);
      }

      // ================= CARGAR CARGOS SCI =================
      await this.cargarChargeSCI();

      return { message: 'Seeders ejecutados correctamente' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async runSeedersCharges() {
    if (process.env.APP_PROD === 'true') {
      return { message: 'No se puede ejecutar seeders en producción' };
    }

    try {
      // ================= CARGAR CARGOS SCI =================
      await this.cargarChargeSCI();
      return { message: 'Seeders de cargos SCI ejecutados correctamente ✅' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  /** Alinea los cargos con el catálogo del manual (`SCI_CHARGE_CATALOG`). */
  async cargarChargeSCI(): Promise<void> {
    const report = await this.chargeCatalogService.sync();
    this.logger.log(`[cargarChargeSCI] ${JSON.stringify(report)}`);
  }
}
