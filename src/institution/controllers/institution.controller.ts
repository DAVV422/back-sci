import {
  Body, Controller, Delete, Get, Param, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { AuthGuard, RolesGuard } from '../../auth/guards';
import { RolesAccess } from '../../auth/decorators';
import { ROLES } from '../../common/constants';
import { ApiResponse } from '../../common/interfaces/responseMessage.interface';
import { contentTypeFor, sendStoredObject } from '../../common/services/storage/stored-files';
import { InstitutionEntity } from '../entities/institution.entity';
import { UpdateInstitutionDto } from '../dto/update-institution.dto';
import { InstitutionService } from '../services/institution.service';
import { logoUploadOptions } from './logo-upload.options';

/**
 * La institución de esta instalación: su nombre y su logo. El logo se sirve sin sesión porque
 * aparece en la pantalla de inicio de sesión; editarlo es cosa del Admin.
 */
@ApiTags('Institution')
@Controller('institution')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @ApiParam({ name: 'filename', type: 'string' })
  @Get('logo/:filename')
  @ApiOperation({ summary: 'Logo de la institución (público)' })
  async logo(@Param('filename') filename: string, @Res() res: Response): Promise<void> {
    const logo = await this.institutionService.getLogo(filename);
    sendStoredObject(res, logo, {
      contentType: contentTypeFor(filename, 'image/png'),
      cache: 'public, max-age=86400',
    });
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesAccess(ROLES.ADMIN)
  @Patch()
  @ApiOperation({ summary: 'Cambiar el nombre o la sigla de la institución' })
  async update(@Body() dto: UpdateInstitutionDto): Promise<ApiResponse<InstitutionEntity>> {
    return { success: true, statusCode: 200, data: await this.institutionService.update(dto) };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesAccess(ROLES.ADMIN)
  @Post('logo')
  @UseInterceptors(FileInterceptor('file', logoUploadOptions))
  @ApiOperation({ summary: 'Subir o reemplazar el logo' })
  async uploadLogo(@UploadedFile() file: Express.Multer.File): Promise<ApiResponse<InstitutionEntity>> {
    return { success: true, statusCode: 201, data: await this.institutionService.setLogo(file) };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @RolesAccess(ROLES.ADMIN)
  @Delete('logo')
  @ApiOperation({ summary: 'Quitar el logo' })
  async removeLogo(): Promise<ApiResponse<InstitutionEntity>> {
    return { success: true, statusCode: 200, data: await this.institutionService.removeLogo() };
  }
}
