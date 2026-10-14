import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard, RolesGuard } from '../../../auth/guards';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { HealthFacilityService } from '../services/health-facility.service';

@ApiTags('Health facility')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('health-facility')
export class HealthFacilityController {
  constructor(private readonly healthFacilityService: HealthFacilityService) {}

  @ApiQuery({ name: 'search', type: 'string', required: false, description: 'Parte del nombre; sin distinguir tildes' })
  @ApiQuery({ name: 'limit', type: 'number', required: false, description: 'Máximo 20' })
  @Get()
  public async search(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<{ id: string; name: string }[]>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.healthFacilityService.search(search ?? '', limit ? Number(limit) || 10 : 10),
    };
  }
}
