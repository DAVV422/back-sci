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
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger/dist';

import { RolesAccess } from '../../auth/decorators/roles.decorator';
import { PublicAccess } from '../../auth/decorators/public.decorator';
import { AuthGuard, RolesGuard } from '../../auth/guards/';
import { AllowWhilePasswordChangePending, GetUser } from '../../auth/decorators';
import { Throttle } from '@nestjs/throttler';
import { authThrottleLimit } from '../../common/constants';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UpdateProfileDto,
  AdminUserDto,
  BulkUpdateGradeDto,
  UserQueryDto,
  ChangePasswordDto,
} from '../dto/';
import { UserDirectoryEntry, UserService } from '../services/user.service';
import { contentTypeFor, sendStoredObject } from '../../common/services/storage/stored-files';
import { ApiResponse } from './../../common/interfaces/responseMessage.interface';
import { ROLES } from './../../common/constants';
import { UserEntity } from '../entities/user.entity';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @RolesAccess(ROLES.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  async createUser(
    @GetUser('role') currentUserRole: string,
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResponse<UserEntity>> {
    return {
      success: true,
      statusCode: 201,
      data: await this.userService.createUser(createUserDto, currentUserRole, file),
    };
  }

  @RolesAccess(ROLES.MANAGER)
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'offset', type: 'number', required: false })
  @ApiQuery({ name: 'order', type: 'string', required: false })
  @ApiQuery({ name: 'search', type: 'string', required: false, description: 'Búsqueda por texto libre en nombre, apellido o correo' })
  @ApiQuery({ name: 'name', type: 'string', required: false, description: 'Filtro específico por nombre' })
  @ApiQuery({ name: 'lastName', type: 'string', required: false, description: 'Filtro específico por apellido' })
  @ApiQuery({ name: 'email', type: 'string', required: false, description: 'Filtro específico por correo' })
  @ApiQuery({ name: 'role', enum: ROLES, required: false, description: 'Filtro por rol institucional' })
  @ApiQuery({ name: 'grade', type: 'string', required: false, description: 'Filtro por grado institucional' })
  @ApiQuery({ name: 'isActive', type: 'boolean', required: false, description: 'Filtro por estado de cuenta en plataforma' })
  @ApiQuery({ name: 'isOperational', type: 'boolean', required: false, description: 'Filtro por disponibilidad operativa de guardia' })
  @ApiQuery({ name: 'attr', type: 'string', required: false, description: 'Atributo dinámico (retrocompatibilidad)' })
  @ApiQuery({ name: 'value', type: 'string', required: false, description: 'Valor dinámico (retrocompatibilidad)' })
  @Get()
  public async findAll(
    @GetUser('role') currentUserRole: string,
    @Query() queryDto: UserQueryDto,
  ): Promise<ApiResponse<UserEntity[]>> {
    const { items, total } = await this.userService.findAll(queryDto, currentUserRole);
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

  @ApiQuery({ name: 'search', type: 'string', required: true, description: 'Nombre o apellido (mínimo 2 caracteres)' })
  @ApiQuery({ name: 'limit', type: 'number', required: false, description: 'Máximo 20' })
  @Get('directory')
  public async searchDirectory(
    @Query('search') search: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<UserDirectoryEntry[]>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.userService.searchDirectory(search, limit ? Number(limit) || 8 : 8),
    };
  }

  @RolesAccess(ROLES.ADMIN)
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'offset', type: 'number', required: false })
  @ApiQuery({ name: 'order', type: 'string', required: false })
  @ApiQuery({ name: 'search', type: 'string', required: false, description: 'Búsqueda por texto libre en nombre, apellido o correo' })
  @ApiQuery({ name: 'name', type: 'string', required: false, description: 'Filtro específico por nombre' })
  @ApiQuery({ name: 'lastName', type: 'string', required: false, description: 'Filtro específico por apellido' })
  @ApiQuery({ name: 'email', type: 'string', required: false, description: 'Filtro específico por correo' })
  @ApiQuery({ name: 'role', enum: ROLES, required: false, description: 'Filtro por rol institucional' })
  @ApiQuery({ name: 'grade', type: 'string', required: false, description: 'Filtro por grado institucional' })
  @ApiQuery({ name: 'isActive', type: 'boolean', required: false, description: 'Filtro por estado de cuenta en plataforma' })
  @ApiQuery({ name: 'isOperational', type: 'boolean', required: false, description: 'Filtro por disponibilidad operativa de guardia' })
  @ApiQuery({ name: 'attr', type: 'string', required: false, description: 'Atributo dinámico (retrocompatibilidad)' })
  @ApiQuery({ name: 'value', type: 'string', required: false, description: 'Valor dinámico (retrocompatibilidad)' })
  @Get('admin/all')
  public async findAllAdmin(
    @GetUser('role') currentUserRole: string,
    @Query() queryDto: UserQueryDto,
  ): Promise<ApiResponse<AdminUserDto[]>> {
    const { items, total } = await this.userService.findAllAdmin(queryDto, currentUserRole);
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

  // Permitido con el cambio pendiente: la web necesita el perfil para dibujar la pantalla de
  // cambio obligatorio (nombre de la persona y si sigue pendiente).
  @AllowWhilePasswordChangePending()
  @Get('me')
  public async myProfile(
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<UserEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.userService.findOne(userId),
    };
  }

  @Patch('me')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  public async updateMyProfile(
    @GetUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResponse<UserEntity>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Perfil actualizado.',
      data: await this.userService.updateProfile(userId, updateProfileDto, file),
    };
  }

  /**
   * Cambia la contraseña de la propia cuenta. Endpoint aparte de `PATCH me` a propósito: exige la
   * contraseña actual, así una sesión robada no puede cambiarla y dejar fuera a su dueño.
   * `@AllowWhilePasswordChangePending` porque es justo lo que debe poder hacerse con el sistema
   * bloqueado por el cambio obligatorio.
   */
  @AllowWhilePasswordChangePending()
  @Throttle({ short: { ttl: 60000, limit: authThrottleLimit(5) } })
  @Patch('me/password')
  public async changeMyPassword(
    @GetUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.userService.changeOwnPassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return { success: true, statusCode: 200, message: result.message, data: result };
  }

  @PublicAccess()
  @ApiParam({ name: 'filename', type: 'string', description: 'Nombre del archivo de imagen' })
  @Get('image/:filename')
  public async getImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const image = await this.userService.getProfileImage(filename);
    sendStoredObject(res, image, { contentType: contentTypeFor(filename, 'image/png'), cache: 'public, max-age=86400' });
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  public async findOne(
    @GetUser('role') currentUserRole: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<UserEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.userService.findOne(id, currentUserRole),
    };
  }

  @RolesAccess(ROLES.MANAGER)
  @Patch('grades')
  public async bulkUpdateGrades(
    @GetUser('role') currentUserRole: string,
    @Body() bulkUpdateGradeDto: BulkUpdateGradeDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.userService.bulkUpdateGrades(
      bulkUpdateGradeDto,
      currentUserRole,
    );
    return {
      success: true,
      statusCode: 200,
      message: 'Actualización de grados institucionales procesada.',
      data,
    };
  }

  @RolesAccess(ROLES.ADMIN)
  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  public async update(
    @GetUser('role') currentUserRole: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResponse<UserEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.userService.update(id, updateUserDto, currentUserRole, file),
    };
  }

  /**
   * Reenvía la invitación de una cuenta sin activar. Reemplaza al endpoint público que había
   * (`POST /resend-activation`), que identificaba por correo y respondía distinto según existiera o
   * no la cuenta, así que servía para averiguar qué correos están registrados.
   */
  @RolesAccess(ROLES.ADMIN)
  @ApiParam({ name: 'id', type: 'string' })
  @Post(':id/resend-activation')
  public async resendActivation(
    @GetUser('role') currentUserRole: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const result = await this.userService.resendActivation(id, currentUserRole);
    return { success: true, statusCode: 200, message: result.message, data: result };
  }

  @RolesAccess(ROLES.MANAGER)
  @ApiParam({ name: 'id', type: 'string' })
  @Patch('status/:id')
  public async updateStatus(
    @GetUser('role') currentUserRole: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ): Promise<ApiResponse<UserEntity>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Estado del usuario actualizado.',
      data: await this.userService.updateStatus(id, updateUserStatusDto, currentUserRole),
    };
  }

  @RolesAccess(ROLES.ADMIN)
  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  public async delete(
    @GetUser('role') currentUserRole: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    return await this.userService.delete(id, currentUserRole);
  }
}
