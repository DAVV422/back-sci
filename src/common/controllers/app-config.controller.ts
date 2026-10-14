import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiResponse } from '../interfaces/responseMessage.interface';
import { getAppTimezone, utcOffsetOf } from '../../config/timezone';

export interface PublicAppConfig {
  /** Zona horaria IANA de la institución, para mostrar fechas (todo se guarda en UTC). */
  timezone: string;
  /** Desfase actual respecto de UTC, p. ej. `-04:00`. Informativo. */
  utcOffset: string;
}

/** Configuración no sensible que los clientes (web y móvil) necesitan para mostrar datos. */
@ApiTags('Config')
@Controller('config')
export class AppConfigController {
  @Get('public')
  @ApiOperation({ summary: 'Configuración pública: zona horaria de la institución' })
  getPublicConfig(): ApiResponse<PublicAppConfig> {
    const timezone = getAppTimezone();
    return {
      success: true,
      statusCode: 200,
      data: { timezone, utcOffset: utcOffsetOf(timezone) },
    };
  }
}
