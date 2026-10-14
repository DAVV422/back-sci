import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Query,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RolesAccess, GetUser } from '../../../auth/decorators';
import { AuthGuard, RolesGuard } from '../../../auth/guards';
import { QueryDto } from '../../../common/dto/query.dto';
import {
  CreateEmergencyDto,
  UpdateEmergencyDto,
  ChangeEmergencyStateDto,
  AssignCommanderDto,
  TransferCommandDto,
} from '../dto/';
import { EmergencyService, PendingForms } from './../services/emergency.service';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { ROLES } from '../../../common/constants';
import { EmergencyEntity } from '../entities/emergency.entity';

@ApiTags('Emergency')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Post()
  async createEmergency(
    @Body() createEmergencyDto: CreateEmergencyDto,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<EmergencyEntity>> {
    return {
      success: true,
      statusCode: 201,
      data: await this.emergencyService.create(createEmergencyDto, userId),
    };
  }

  @Get()
  public async findAll(
    @Query() queryDto: QueryDto,
  ): Promise<ApiResponse<EmergencyEntity[]>> {
    const { items, total } = await this.emergencyService.findAll(queryDto);
    return {
      success: true,
      statusCode: 200,
      data: items,
      meta: {
        total,
        limit: queryDto.limit ?? items.length,
        offset: queryDto.offset ?? 0,
      },
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  public async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<EmergencyEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.emergencyService.findOne(id),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEmergencyDto: UpdateEmergencyDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<EmergencyEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.emergencyService.update(
        id,
        updateEmergencyDto,
        userId,
        userRole,
      ),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id/state')
  public async changeState(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeStateDto: ChangeEmergencyStateDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<EmergencyEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.emergencyService.changeState(
        id,
        changeStateDto,
        userId,
        userRole,
      ),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Post(':id/attend/assign-commander')
  public async assignCommander(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignCommanderDto: AssignCommanderDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<EmergencyEntity>> {
    const data = await this.emergencyService.assignCommander(
      id,
      assignCommanderDto,
      userId,
      userRole,
    );
    return {
      success: true,
      statusCode: 200,
      message: 'Comandante de Incidente inicial asignado exitosamente.',
      data,
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id/forms/pending')
  public async findPendingForms(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<PendingForms>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.emergencyService.findPendingForms(id),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Post(':id/forms/finalize-all')
  public async finalizeAllForms(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<PendingForms>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Formularios finalizados. Ya no se pueden cargar datos en ellos.',
      data: await this.emergencyService.finalizeAllForms(id, userId, userRole),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Post(':id/attend/transfer-command')
  public async transferCommand(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() transferCommandDto: TransferCommandDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<EmergencyEntity>> {
    const data = await this.emergencyService.transferCommand(
      id,
      transferCommandDto,
      userId,
      userRole,
    );
    return {
      success: true,
      statusCode: 200,
      message: 'Traspaso de mando completado exitosamente.',
      data,
    };
  }

  @RolesAccess(ROLES.ADMIN)
  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  public async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    return await this.emergencyService.delete(id);
  }
}
