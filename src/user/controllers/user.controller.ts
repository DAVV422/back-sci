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
import { GetUser } from '../../auth/decorators';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UpdateProfileDto,
  AdminUserDto,
  BulkUpdateGradeDto,
  UserQueryDto,
} from '../dto/';
import { UserService } from '../services/user.service';
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

  @PublicAccess()
  @ApiParam({ name: 'filename', type: 'string', description: 'Nombre del archivo de imagen' })
  @Get('image/:filename')
  public getImage(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): void {
    const filePath = this.userService.getProfileImagePath(filename);
    res.sendFile(filePath);
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
