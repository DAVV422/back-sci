import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { handlerError } from './../common/utils/handlerError.utils';
import { ROLES } from './../common/constants';
import { CreateUserDto } from './../user/dto';
import { UserService } from './../user/services/user.service';
import { CreateChargeDto } from './../sci_module/charges/dto/create-charge.dto';
import { ChargeService } from './../sci_module/charges/services/charge.service';
import { ChargeEntity } from './../sci_module/charges/entities/charges.entity';

@Injectable()
export class SeedService {
  private readonly logger = new Logger('SeederService');

  constructor(
    private readonly userService: UserService,
    private readonly chargeService: ChargeService,
    private readonly configService: ConfigService,
  ) {}

  public async runAllSeeders() {
    if (process.env.APP_PROD === true) {
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

      // 🔍 Crear usuario admin solo si no existe previamente (idempotente)
      let adminExists = false;
      try {
        await this.userService.findByEmail(adminEmail);
        adminExists = true;
      } catch (error) {
        adminExists = false;
      }

      if (!adminExists) {
        const user: CreateUserDto = {
          name:
            this.configService.get<string>('ADMIN_NAME') ?? 'Administrador',
          last_name:
            this.configService.get<string>('ADMIN_LAST_NAME') ?? 'Sistema',
          cellphone: '00000000',
          grade: 'Administrador del Sistema',
          birthdate: new Date('2000-01-01'),
          email: adminEmail,
          password: adminPassword,
          role: ROLES.ADMIN,
        };

        await this.userService.createUser(user);
      }

      // ================= CARGAR CARGOS SCI =================
      await this.cargarChargeSCI();

      return { message: 'Seeders ejecutados correctamente' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  public async runSeedersCharges() {
    if (process.env.APP_PROD === true) {
      return { message: 'No se puede ejecutar seeders en producción' };
    }

    try {
      // 🔍 Verificar si ya existen cargos SCI
      const totalCharges = await this.chargeService.countCharges();
      if (totalCharges > 0) {
        return {
          message:
            'Ya existen cargos SCI en la base de datos. Seeder cancelado.',
        };
      }

      // ================= CARGAR CARGOS SCI =================
      await this.cargarChargeSCI();

      return { message: 'Seeders ejecutados correctamente ✅' };
    } catch (error) {
      handlerError(error, this.logger);
    }
  }

  async cargarChargeSCI(): Promise<void> {
    const cargos: CreateChargeDto[] = [
      // ================= NIVEL 1 =================
      {
        name: 'Comandante del Incidente',
        level: 1,
        weight: 1,
        system_name: 'incident_commander',
      },

      // ================= NIVEL 2 =================
      // Estado Mayor de Comando
      { name: 'Oficial de Seguridad', level: 2, weight: 2 },
      { name: 'Oficial de Enlace', level: 2, weight: 3 },
      { name: 'Oficial de Información Pública', level: 2, weight: 4 },

      // Jefes de Sección
      {
        name: 'Jefe de Operaciones',
        level: 2,
        weight: 5,
        system_name: 'operations_chief',
      },
      {
        name: 'Jefe de Planificación',
        level: 2,
        weight: 6,
        system_name: 'planning_chief',
      },
      {
        name: 'Jefe de Logística',
        level: 2,
        weight: 7,
        system_name: 'logistics_chief',
      },
      {
        name: 'Jefe de Administración y Finanzas',
        level: 2,
        weight: 8,
        system_name: 'admin_finance_chief',
      },

      // ================= NIVEL 3 =================
      // Operaciones
      { name: 'Director de Rama', level: 3, weight: 4 },
      { name: 'Supervisor de División', level: 3, weight: 3 },
      { name: 'Supervisor de Grupo', level: 3, weight: 2 },

      // Planificación
      { name: 'Líder de Unidad de Situación', level: 3, weight: 3 },
      { name: 'Líder de Unidad de Recursos', level: 3, weight: 2 },
      { name: 'Líder de Unidad de Documentación', level: 3, weight: 1 },
      { name: 'Líder de Unidad de Desmovilización', level: 3, weight: 0 },

      // Logística
      { name: 'Jefe de Rama de Apoyo', level: 3, weight: 2 },
      { name: 'Jefe de Rama de Servicios', level: 3, weight: 1 },

      // Administración / Finanzas
      { name: 'Líder de Unidad de Costos', level: 3, weight: 3 },
      { name: 'Líder de Unidad de Compras', level: 3, weight: 2 },
      { name: 'Líder de Unidad de Tiempo', level: 3, weight: 1 },
      { name: 'Líder de Compensaciones y Reclamaciones', level: 3, weight: 0 },

      // ================= NIVEL 4 =================
      { name: 'Unidad de Comunicaciones', level: 4, weight: 3 },
      { name: 'Unidad Médica', level: 4, weight: 2 },
      { name: 'Unidad de Alimentación', level: 4, weight: 1 },
      { name: 'Unidad de Transporte', level: 4, weight: 0 },

      // ================= NIVEL 5 =================
      { name: 'Rescatista', level: 5, weight: 2 },
      { name: 'Paramédico', level: 5, weight: 1 },
      { name: 'Voluntario de Apoyo', level: 5, weight: 0 },
    ];

    for (const cargo of cargos) {
      try {
        let existing: ChargeEntity | null = null;
        try {
          existing = await this.chargeService.findByName(cargo.name);
        } catch (error) {
          existing = null;
        }

        if (existing) {
          await this.chargeService.update(existing.id, {
            system_name: cargo.system_name,
          });
        } else {
          await this.chargeService.create(cargo);
        }
      } catch (error) {
        this.logger.error(`Error al crear cargo SCI: ${cargo.name}`, error);
      }
    }
  }
}
