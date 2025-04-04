import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';

import { ResourceService } from '../services/resource.service';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';
import { ResponseMessage } from '../../common/interfaces/responseMessage.interface';
import { AuthGuard, RolesGuard } from '../../auth/guards';

@ApiTags('Resource')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('resource')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  public async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.resourceService.findOne(id),
    };
  }

  @Post()
  public async create(@Body() createResourceDto: CreateResourceDto): Promise<ResponseMessage> {
    return {
      statusCode: 201,
      data: await this.resourceService.create(createResourceDto),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateResourceDto: UpdateResourceDto,
  ): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.resourceService.update(id, updateResourceDto),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return  await this.resourceService.delete(id);
  }

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @Get('by-emergency/:emergencyId')
  public async findByEmergencyId(@Param('emergencyId', ParseUUIDPipe) emergencyId: string): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.resourceService.findByEmergencyId(emergencyId),
    };
  }

  @ApiParam({ name: 'equipmentId', type: 'string' })
  @Get('by-equipment/:equipmentId')
  public async findByEquipmentId(@Param('equipmentId', ParseUUIDPipe) equipmentId: string): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.resourceService.findByEquipmentId(equipmentId),
    };
  }
}
