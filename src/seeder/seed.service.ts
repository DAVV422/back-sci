import { Injectable, Logger } from '@nestjs/common';

import { handlerError } from './../common/utils/handlerError.utils';
import { ROLES } from './../common/constants';
import { CreateUserDto } from './../user/dto';
import { UserService } from './../user/services/user.service';
import { CreateChargeDto } from './../sci_module/charges/dto/create-charge.dto';
import { ChargeService } from './../sci_module/charges/services/charge.service';

@Injectable()
export class SeedService {
  private readonly logger = new Logger('SeederService');

  constructor(private readonly userService: UserService, private readonly chargeService: ChargeService) { }

  public async runAllSeeders() {
    if (process.env.APP_PROD === true) {
      return { message: 'No se puede ejecutar seeders en producción' };
    }

    try {
      // 🔍 Verificar si ya existen usuarios
      const totalUsers = await this.userService.countUsers();
      if (totalUsers > 0) {
        return { message: 'Ya existen usuarios en la base de datos. Seeder cancelado.' };
      }

      // 🔍 Verificar si ya existen cargos SCI
      const totalCharges = await this.chargeService.countCharges();
      if (totalCharges > 0) {
        return { message: 'Ya existen cargos SCI en la base de datos. Seeder cancelado.' };
      }

      // ================= CREAR USUARIO ADMIN =================
      const user: CreateUserDto = {
        name: 'diego',
        last_name: 'vargas',
        cellphone: '67303324',
        birthdate: new Date('2000-04-18'),
        grade: 'Bombero I 3er Año',
        email: 'diego@live.com',
        password: '123456789',
        role: ROLES.ADMIN,
      };

      await this.userService.createUser(user);

      // ================= CARGAR CARGOS SCI =================
      await this.cargarChargeSCI();

      return { message: 'Seeders ejecutados correctamente ✅' };
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
        return { message: 'Ya existen cargos SCI en la base de datos. Seeder cancelado.' };
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
      { name: 'Comandante del Incidente', level: 1, weight: 1 },

      // ================= NIVEL 2 =================
      // Estado Mayor de Comando
      { name: 'Oficial de Seguridad', level: 2, weight: 2 },
      { name: 'Oficial de Enlace', level: 2, weight: 3 },
      { name: 'Oficial de Información Pública', level: 2, weight: 4 },

      // Jefes de Sección
      { name: 'Jefe de Operaciones', level: 2, weight: 5 },
      { name: 'Jefe de Planificación', level: 2, weight: 6 },
      { name: 'Jefe de Logística', level: 2, weight: 7 },
      { name: 'Jefe de Administración y Finanzas', level: 2, weight: 8 },

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
      { name: 'Voluntario de Apoyo', level: 5, weight: 0 }
    ];

    for (const cargo of cargos) {
      try {
        await this.chargeService.create(cargo);
      } catch (error) {
        this.logger.error(`Error al crear cargo SCI: ${cargo.name}`, error);
      }
    }
  }

}
