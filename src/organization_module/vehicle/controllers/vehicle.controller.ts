import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { AuthGuard, RolesGuard } from '../../../auth/guards';
import { GetUser, RolesAccess } from '../../../auth/decorators';
import { ROLES } from '../../../common/constants';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { VehicleService, VehicleWithDispatch } from '../services/vehicle.service';
import { VehicleEntity } from '../entities/vehicle.entity';
import { VehicleDispatchEntity } from '../entities/vehicle-dispatch.entity';
import { AddVehicleItemsDto, CreateVehicleDto, DispatchVehicleDto, ReturnVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

@ApiTags('Vehicle')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get('vehicle')
  @ApiOperation({ summary: 'Vehículos con su carga estándar y, si está en una, la emergencia' })
  async findAll(): Promise<ApiResponse<VehicleWithDispatch[]>> {
    return { success: true, statusCode: 200, data: await this.vehicleService.findAll() };
  }

  @RolesAccess(ROLES.MANAGER)
  @Post('vehicle')
  async create(@Body() dto: CreateVehicleDto): Promise<ApiResponse<VehicleEntity>> {
    return { success: true, statusCode: 201, data: await this.vehicleService.create(dto) };
  }

  @RolesAccess(ROLES.MANAGER)
  @ApiParam({ name: 'id', type: 'string' })
  @Patch('vehicle/:id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleDto): Promise<ApiResponse<VehicleEntity>> {
    return { success: true, statusCode: 200, data: await this.vehicleService.update(id, dto) };
  }

  @RolesAccess(ROLES.MANAGER)
  @ApiParam({ name: 'id', type: 'string' })
  @Delete('vehicle/:id')
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<null>> {
    return await this.vehicleService.delete(id);
  }

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @Get('emergency/:emergencyId/vehicle')
  @ApiOperation({ summary: 'Vehículos despachados a la emergencia (activos y devueltos)' })
  async findDispatches(@Param('emergencyId', ParseUUIDPipe) emergencyId: string): Promise<ApiResponse<VehicleDispatchEntity[]>> {
    return { success: true, statusCode: 200, data: await this.vehicleService.findDispatchesByEmergency(emergencyId) };
  }

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @Post('emergency/:emergencyId/vehicle')
  @ApiOperation({ summary: 'Despachar un vehículo con su equipo a la emergencia' })
  async dispatch(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() dto: DispatchVehicleDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<VehicleDispatchEntity>> {
    return { success: true, statusCode: 201, data: await this.vehicleService.dispatch(emergencyId, dto, userId, userRole) };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Post('vehicle-dispatch/:id/items')
  @ApiOperation({ summary: 'Agregar equipo a bordo de un vehículo despachado' })
  async addItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddVehicleItemsDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<VehicleDispatchEntity>> {
    return { success: true, statusCode: 201, data: await this.vehicleService.addItems(id, dto, userId, userRole) };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch('vehicle-dispatch/:id/return')
  @ApiOperation({ summary: 'Devolver un vehículo con su equipo' })
  async returnVehicle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnVehicleDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<VehicleDispatchEntity>> {
    return { success: true, statusCode: 200, data: await this.vehicleService.returnVehicle(id, dto, userId, userRole) };
  }
}
