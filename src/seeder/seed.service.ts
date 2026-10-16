import { BadRequestException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { handlerError } from '../common/utils/handlerError.utils';
import { ROLES } from '../common/constants';
import { CreateUserDto } from '../user/dto';
import { UserService } from '../user/services/user.service';
import { ChargeCatalogService } from '../sci_module/charges/services/charge-catalog.service';

/**
 * `/seed/*` es una herramienta de desarrollo y no exige sesión: en producción (APP_PROD=true)
 * responde 404. Para que una instalación nueva tenga con qué entrar, el primer superadministrador
 * se crea al arrancar desde ADMIN_EMAIL/ADMIN_PASSWORD (solo si ese correo no existe; nunca
 * cambia la contraseña de una cuenta existente). Los cargos se sincronizan en ChargeCatalogService.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('SeederService');

  constructor(
    private readonly userService: UserService,
    private readonly chargeCatalogService: ChargeCatalogService,
    private readonly configService: ConfigService,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.ensureInitialAdmin();
    } catch (error: any) {
      this.logger.error(`[bootstrap] No se pudo crear el administrador inicial: ${error?.message}`);
    }
  }

  /** Crea el superadministrador de ADMIN_EMAIL si todavía no existe. Devuelve si lo creó. */
  async ensureInitialAdmin(): Promise<boolean> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');
    if (!adminEmail || !adminPassword) return false;
    try {
      await this.userService.findByEmail(adminEmail);
      return false;
    } catch {
      // No existe: se crea.
    }
    await this.userService.createUser(this.adminDto(adminEmail, adminPassword), ROLES.SUADMIN);
    this.logger.log(`[bootstrap] Superadministrador inicial creado: ${adminEmail}`);
    return true;
  }

  private adminDto(email: string, password: string): CreateUserDto {
    return {
      name: this.configService.get<string>('ADMIN_NAME') ?? 'Administrador',
      lastName: this.configService.get<string>('ADMIN_LAST_NAME') ?? 'Sistema',
      cellphone: '00000000',
      grade: 'Administrador del Sistema',
      birthdate: new Date('2000-01-01'),
      email,
      password,
      role: ROLES.SUADMIN,
      isActive: true,
    };
  }

  private assertNotProduction(): void {
    if (process.env.APP_PROD === 'true') throw new NotFoundException();
  }

  public async runAllSeeders() {
    this.assertNotProduction();

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
        // El seeder actúa como el propio sistema: createUser solo permite crear un
        // suadmin a otro suadmin, y en una base vacía todavía no existe ninguno.
        await this.userService.createUser(this.adminDto(adminEmail, adminPassword), ROLES.SUADMIN);
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
        await this.userService.update(existingUser.id, updates, ROLES.SUADMIN); // actúa el propio sistema
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
    this.assertNotProduction();

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
