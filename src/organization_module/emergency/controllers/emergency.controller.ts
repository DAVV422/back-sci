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
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RolesAccess, GetUser } from '../../../auth/decorators';
import { AuthGuard, RolesGuard } from '../../../auth/guards';
import { QueryDto } from '../../../common/dto/query.dto';
import {
  CreateEmergencyDto,
  UpdateEmergencyDto,
  ChangeEmergencyStateDto,
} from '../dto/';
import { EmergencyService } from './../services/emergency.service';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { ROLES } from '../../../common/constants';
import { EmergencyEntity } from '../entities/emergency.entity';

@ApiTags('Emergency')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  @Post()
  async createEmergency(
    @Body() createEmergencyDto: CreateEmergencyDto,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<EmergencyEntity>> {
    return {
      success: true,
      statusCode: 201,
      data: await this.emergencyService.create(createEmergencyDto, userId),
    };
  }

  @Get()
  public async findAll(
    @Query() queryDto: QueryDto,
  ): Promise<ApiResponse<EmergencyEntity[]>> {
    const { items, total } = await this.emergencyService.findAll(queryDto);
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

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  public async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<EmergencyEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.emergencyService.findOne(id),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEmergencyDto: UpdateEmergencyDto,
  ): Promise<ApiResponse<EmergencyEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.emergencyService.update(id, updateEmergencyDto),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id/state')
  public async changeState(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeStateDto: ChangeEmergencyStateDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<EmergencyEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.emergencyService.changeState(
        id,
        changeStateDto,
        userId,
        userRole,
      ),
    };
  }

  @RolesAccess(ROLES.ADMIN)
  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  public async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    return await this.emergencyService.delete(id);
  }
}
