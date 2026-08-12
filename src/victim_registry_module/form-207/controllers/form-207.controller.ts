import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

import { AuthGuard, RolesGuard } from '../../../auth/guards';
import { Form207Service } from '../services/form-207.service';
import { CreateForm207Dto } from '../dto/create-form-207.dto';
import { Form207Entity } from '../entities/form-207.entity';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { GetUser } from '../../../auth/decorators';

@ApiTags('Form 207')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class Form207Controller {
  constructor(private readonly form207Service: Form207Service) {}

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @Post('emergency/:emergencyId/form207')
  async create(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Body() createForm207Dto: CreateForm207Dto,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<Form207Entity>> {
    const form207 = await this.form207Service.create(
      emergencyId,
      createForm207Dto,
      userId,
    );
    return {
      success: true,
      statusCode: 201,
      message: 'Formulario 207 creado exitosamente.',
      data: form207,
    };
  }

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @Get('emergency/:emergencyId/form207')
  async findByEmergency(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<ApiResponse<Form207Entity[]>> {
    const forms = await this.form207Service.findByEmergency(emergencyId);
    return {
      success: true,
      statusCode: 200,
      data: forms,
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch('form207/:id/finalize')
  async finalize(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<Form207Entity>> {
    const form207 = await this.form207Service.finalize(id, userId);
    return {
      success: true,
      statusCode: 200,
      message: 'Formulario 207 finalizado exitosamente.',
      data: form207,
    };
  }
}
