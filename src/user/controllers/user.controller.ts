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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger/dist';

import { RolesAccess } from '../../auth/decorators/roles.decorator';
import { AuthGuard, RolesGuard } from '../../auth/guards/';
import { GetUser } from '../../auth/decorators';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  UpdateProfileDto,
} from '../dto/';
import { UserService } from '../services/user.service';
import { QueryDto } from '../../common/dto/query.dto';
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
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<ApiResponse<UserEntity>> {
    return {
      success: true,
      statusCode: 201,
      data: await this.userService.createUser(createUserDto),
    };
  }

  @RolesAccess(ROLES.MANAGER)
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'offset', type: 'number', required: false })
  @ApiQuery({ name: 'order', type: 'string', required: false })
  @ApiQuery({ name: 'attr', type: 'string', required: false })
  @ApiQuery({ name: 'value', type: 'string', required: false })
  @Get()
  public async findAll(
    @Query() queryDto: QueryDto,
  ): Promise<ApiResponse<UserEntity[]>> {
    const { items, total } = await this.userService.findAll(queryDto);
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
  public async updateMyProfile(
    @GetUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ApiResponse<UserEntity>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Perfil actualizado.',
      data: await this.userService.updateProfile(userId, updateProfileDto),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  public async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<UserEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.userService.findOne(id),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<UserEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.userService.update(id, updateUserDto),
    };
  }

  @RolesAccess(ROLES.MANAGER)
  @ApiParam({ name: 'id', type: 'string' })
  @Patch('status/:id')
  public async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
  ): Promise<ApiResponse<UserEntity>> {
    return {
      success: true,
      statusCode: 200,
      message: 'Estado del usuario actualizado.',
      data: await this.userService.updateStatus(id, updateUserStatusDto),
    };
  }

  @RolesAccess(ROLES.ADMIN)
  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  public async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    return await this.userService.delete(id);
  }
}
