import { Body, Controller, Get, Delete, Param, UseGuards, ParseUUIDPipe, Query, Patch, Post, UseInterceptors, UploadedFile, } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger/dist';

import { RolesAccess } from '../../auth/decorators/roles.decorator';
import { AuthGuard, RolesGuard } from '../../auth/guards/';
import { CreateUserDto, UpdateUserDto } from '../dto/';
import { UserService } from '../services/user.service';
import { QueryDto } from '../../common/dto/query.dto';
import { ResponseMessage } from './../../common/interfaces/responseMessage.interface';
import { ROLES } from './../../common/constants';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @RolesAccess(ROLES.MANAGER)
  @Post()
  async createUser(
    @Body() createUserDto: CreateUserDto,    
  ): Promise<ResponseMessage> {
    return {
      statusCode: 201,
      data: await this.userService.createUser(createUserDto),
    }
  }
  
  @RolesAccess(ROLES.MANAGER)
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'offset', type: 'number', required: false })
  @ApiQuery({ name: 'order', type: 'string', required: false })
  @ApiQuery({ name: 'attr', type: 'string', required: false })
  @ApiQuery({ name: 'value', type: 'string', required: false })
  @Get()
  public async findAll(@Query() queryDto: QueryDto): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.userService.findAll(queryDto),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  public async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.userService.findOne(id),
    }
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.userService.update(id, updateUserDto),
    };
  }

  @RolesAccess(ROLES.MANAGER)
  @ApiParam({ name: 'id', type: 'string' })
  @Get('/deactivate/:id')
  public async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return await this.userService.deactivate(id);
  }

  @RolesAccess(ROLES.MANAGER)
  @ApiParam({ name: 'id', type: 'string' })
  @Get('/deactivate/:id')
  public async activate(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return await this.userService.activate(id);
  }

  @RolesAccess(ROLES.ADMIN)
  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return await this.userService.delete(id);
  }
}
