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
        };

        await this.userService.createUser(user);
        this.logger.log(`Usuario Super Admin (suadmin) creado exitosamente: ${adminEmail}`);
      } else {
        if (existingUser.role !== ROLES.SUADMIN) {
          await this.userService.update(existingUser.id, { role: ROLES.SUADMIN });
          this.logger.log(`Usuario ${adminEmail} actualizado a rol Super Admin (suadmin).`);
        } else {
          this.logger.log(`Usuario Super Admin (suadmin) ${adminEmail} ya existe.`);
        }
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

  async cargarChargeSCI(): Promise<void> {
    const cargos: CreateChargeDto[] = [
      // ================= NIVEL 1: MANDO =================
      {
        name: 'Comandante del Incidente',
        abbreviation: 'CI',
        level: 1,
        weight: 1.0,
        systemName: 'incident_commander',
      },
      {
        name: 'Comandante Adjunto',
        abbreviation: 'CI-ADJ',
        level: 1,
        weight: 1.5,
      },

      // ================= NIVEL 2: ESTADO MAYOR Y JEFATURAS =================
      // Estado Mayor de Comando
      {
        name: 'Oficial de Seguridad',
        abbreviation: 'OS',
        level: 2,
        weight: 2.1,
        systemName: 'safety_officer',
      },
      {
        name: 'Oficial de Información Pública',
        abbreviation: 'OIP',
        level: 2,
        weight: 2.2,
        systemName: 'public_info_officer',
      },
      {
        name: 'Oficial de Enlace',
        abbreviation: 'OE',
        level: 2,
        weight: 2.3,
        systemName: 'liaison_officer',
      },

      // Jefaturas de Sección
      {
        name: 'Jefe de Operaciones',
        abbreviation: 'JOP',
        level: 2,
        weight: 5.0,
        systemName: 'operations_chief',
      },
      {
        name: 'Jefe de Planificación',
        abbreviation: 'JPLAN',
        level: 2,
        weight: 6.0,
        systemName: 'planning_chief',
      },
      {
        name: 'Jefe de Logística',
        abbreviation: 'JLOG',
        level: 2,
        weight: 7.0,
        systemName: 'logistics_chief',
      },
      {
        name: 'Jefe de Administración y Finanzas',
        abbreviation: 'JAF',
        level: 2,
        weight: 8.0,
        systemName: 'admin_finance_chief',
      },

      // ================= NIVEL 3: RAMAS, DIVISIONES, GRUPOS Y UNIDADES =================
      // Operaciones
      {
        name: 'Director de Rama',
        abbreviation: 'DIR-RAMA',
        level: 3,
        weight: 5.1,
      },
      {
        name: 'Supervisor de División',
        abbreviation: 'SUP-DIV',
        level: 3,
        weight: 5.2,
      },
      {
        name: 'Supervisor de Grupo',
        abbreviation: 'SUP-GRUPO',
        level: 3,
        weight: 5.3,
      },

      // Planificación
      {
        name: 'Líder de Unidad de Recursos',
        abbreviation: 'LID-REC',
        level: 3,
        weight: 6.1,
      },
      {
        name: 'Líder de Unidad de Situación',
        abbreviation: 'LID-SIT',
        level: 3,
        weight: 6.2,
      },
      {
        name: 'Líder de Unidad de Documentación',
        abbreviation: 'LID-DOC',
        level: 3,
        weight: 6.3,
      },
      {
        name: 'Líder de Unidad de Desmovilización',
        abbreviation: 'LID-DES',
        level: 3,
        weight: 6.4,
      },
      {
        name: 'Especialista Técnico',
        abbreviation: 'ESP-TEC',
        level: 3,
        weight: 6.5,
      },

      // Logística
      {
        name: 'Director de Rama de Servicios',
        abbreviation: 'DIR-SERV',
        level: 3,
        weight: 7.1,
      },
      {
        name: 'Director de Rama de Apoyo',
        abbreviation: 'DIR-APOYO',
        level: 3,
        weight: 7.2,
      },

      // Administración y Finanzas
      {
        name: 'Líder de Unidad de Tiempo',
        abbreviation: 'LID-TIEMPO',
        level: 3,
        weight: 8.1,
      },
      {
        name: 'Líder de Unidad de Compras',
        abbreviation: 'LID-COMPRAS',
        level: 3,
        weight: 8.2,
      },
      {
        name: 'Líder de Unidad de Costos',
        abbreviation: 'LID-COSTOS',
        level: 3,
        weight: 8.3,
      },
      {
        name: 'Líder de Unidad de Compensaciones',
        abbreviation: 'LID-COMP',
        level: 3,
        weight: 8.4,
      },

      // ================= NIVEL 4: UNIDADES DE SOPORTE =================
      // Rama de Servicios
      {
        name: 'Líder de Unidad de Comunicaciones',
        abbreviation: 'LID-COM',
        level: 4,
        weight: 7.11,
      },
      {
        name: 'Líder de Unidad Médica',
        abbreviation: 'LID-MED',
        level: 4,
        weight: 7.12,
        systemName: 'medical_unit_leader',
      },
      {
        name: 'Líder de Unidad de Alimentación',
        abbreviation: 'LID-ALIM',
        level: 4,
        weight: 7.13,
      },

      // Rama de Apoyo
      {
        name: 'Líder de Unidad de Suministros',
        abbreviation: 'LID-SUM',
        level: 4,
        weight: 7.21,
      },
      {
        name: 'Líder de Unidad de Instalaciones',
        abbreviation: 'LID-INST',
        level: 4,
        weight: 7.22,
      },
      {
        name: 'Líder de Unidad de Transporte',
        abbreviation: 'LID-TRANSP',
        level: 4,
        weight: 7.23,
      },

      // ================= NIVEL 5: PERSONAL DE EJECUCIÓN Y TÁCTICO =================
      {
        name: 'Equipo de Ataque',
        abbreviation: 'EQ-ATK',
        level: 5,
        weight: 5.1,
        systemName: 'attack_team',
      },
      {
        name: 'Fuerza de Tarea',
        abbreviation: 'FT',
        level: 5,
        weight: 5.2,
      },
      {
        name: 'Rescatista',
        abbreviation: 'RESC',
        level: 5,
        weight: 5.3,
      },
      {
        name: 'Paramédico',
        abbreviation: 'PARAM',
        level: 5,
        weight: 5.4,
      },
      {
        name: 'Bombero / Combatiente',
        abbreviation: 'BOMB',
        level: 5,
        weight: 5.5,
      },
      {
        name: 'Voluntario de Apoyo',
        abbreviation: 'VOL',
        level: 5,
        weight: 5.6,
      },
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
            abbreviation: cargo.abbreviation,
            level: cargo.level,
            weight: cargo.weight,
            systemName: cargo.systemName,
          });
        } else {
          await this.chargeService.create(cargo);
        }
      } catch (error) {
        this.logger.error(`Error al procesar cargo SCI: ${cargo.name}`, error);
      }
    }
  }
}
