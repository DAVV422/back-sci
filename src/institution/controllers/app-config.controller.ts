import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiResponse } from '../../common/interfaces/responseMessage.interface';
import { getAppTimezone, utcOffsetOf } from '../../config/timezone';
import { InstitutionService, PublicInstitution } from '../services/institution.service';

export interface PublicAppConfig {
  /** Zona horaria IANA de la institución, para mostrar fechas (todo se guarda en UTC). */
  timezone: string;
  /** Desfase actual respecto de UTC, p. ej. `-04:00`. Informativo. */
  utcOffset: string;
  /** Nombre, sigla y logo de la institución: distinguen una instalación de otra. */
  institution: PublicInstitution;
}

/** Configuración no sensible que los clientes (web y móvil) necesitan para mostrar datos. */
@ApiTags('Config')
@Controller('config')
export class AppConfigController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get('public')
  @ApiOperation({ summary: 'Configuración pública: zona horaria e institución' })
  async getPublicConfig(): Promise<ApiResponse<PublicAppConfig>> {
    const timezone = getAppTimezone();
    return {
      success: true,
      statusCode: 200,
      data: {
        timezone,
        utcOffset: utcOffsetOf(timezone),
        institution: await this.institutionService.findPublic(),
      },
    };
  }
}
