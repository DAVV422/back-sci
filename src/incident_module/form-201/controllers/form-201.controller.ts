import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

import { AuthGuard, RolesGuard } from '../../../auth/guards';
import { RolesAccess } from '../../../auth/decorators';
import { ROLES } from '../../../common/constants';
import { CreateForm201Dto } from '../dto/create-form-201.dto';
import { UpdateForm201Dto } from '../dto/update-form-201.dto';
import { Form201Service } from '../services/form-201.service';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { Form201Entity } from '../entities/form-201.entity';
import { GetUser } from '../../../auth/decorators';

@ApiTags('Form201')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class Form201Controller {
  constructor(private readonly form201Service: Form201Service) {}

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @Post('emergency/:emergencyId/form201')
  async create(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() createForm201Dto: CreateForm201Dto,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<Form201Entity>> {
    const form201 = await this.form201Service.create(
      emergencyId,
      createForm201Dto,
      userId,
    );
    return {
      success: true,
      statusCode: 201,
      message: 'Formulario 201 creado exitosamente.',
      data: form201,
    };
  }

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @Get('emergency/:emergencyId/form201')
  async findActiveByEmergency(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<ApiResponse<Form201Entity>> {
    const form201 = await this.form201Service.findActiveByEmergency(emergencyId);
    return {
      success: true,
      statusCode: 200,
      data: form201,
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch('form201/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateForm201Dto: UpdateForm201Dto,
  ): Promise<ApiResponse<Form201Entity>> {
    const form201 = await this.form201Service.update(id, updateForm201Dto);
    return {
      success: true,
      statusCode: 200,
      message: 'Formulario 201 actualizado exitosamente.',
      data: form201,
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch('form201/:id/finalize')
  async finalize(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<Form201Entity>> {
    const form201 = await this.form201Service.finalize(id, userId);
    return {
      success: true,
      statusCode: 200,
      message: 'Formulario 201 finalizado exitosamente.',
      data: form201,
    };
  }

  @RolesAccess(ROLES.MANAGER)
  @ApiParam({ name: 'id', type: 'string' })
  @Delete('form201/:id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.form201Service.delete(id);
    return {
      success: true,
      statusCode: 200,
      message: 'Formulario 201 eliminado exitosamente.',
      data: null,
    };
  }
}
