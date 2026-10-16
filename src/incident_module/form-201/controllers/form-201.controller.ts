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
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { croquisUploadOptions } from './croquis-upload.options';
import { contentTypeFor, sendStoredObject } from '../../../common/services/storage/stored-files';

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
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<Form201Entity>> {
    const form201 = await this.form201Service.create(
      emergencyId,
      createForm201Dto,
      userId,
      userRole,
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
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<Form201Entity>> {
    const form201 = await this.form201Service.update(
      id,
      updateForm201Dto,
      userId,
      userRole,
    );
    return {
      success: true,
      statusCode: 200,
      message: 'Formulario 201 actualizado exitosamente.',
      data: form201,
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @Put('form201/:id/croquis')
  @UseInterceptors(FileInterceptor('file', croquisUploadOptions))
  async setCroquis(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<Form201Entity>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Croquis guardado.',
      data: await this.form201Service.setCroquis(id, file, userId, userRole),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Delete('form201/:id/croquis')
  async removeCroquis(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<Form201Entity>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Croquis eliminado.',
      data: await this.form201Service.removeCroquis(id, userId, userRole),
    };
  }

  /** Requiere sesión (no es público como las fotos de perfil): el front lo pide como blob. */
  @ApiParam({ name: 'id', type: 'string' })
  @Get('form201/:id/croquis')
  async getCroquis(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    const { object, fileName } = await this.form201Service.getCroquis(id);
    sendStoredObject(res, object, { contentType: contentTypeFor(fileName, 'image/png') });
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch('form201/:id/finalize')
  async finalize(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<Form201Entity>> {
    const form201 = await this.form201Service.finalize(id, userId, userRole);
    return {
      success: true,
      statusCode: 200,
      message: 'Formulario 201 finalizado exitosamente.',
      data: form201,
    };
  }

  @RolesAccess(ROLES.BASIC)
  @ApiParam({ name: 'id', type: 'string' })
  @Delete('form201/:id')
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<null>> {
    await this.form201Service.delete(id, userId, userRole);
    return {
      success: true,
      statusCode: 200,
      message: 'Formulario 201 eliminado exitosamente.',
      data: null,
    };
  }
}
