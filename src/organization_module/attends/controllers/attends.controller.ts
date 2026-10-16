import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Patch,
  Post,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

import { AttendService } from '../services/attends.service';
import { CreateAttendDto } from '../dto/create-attend.dto';
import { UpdateAttendDto } from '../dto/update-attend.dto';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { AuthGuard, RolesGuard } from '../../../auth/guards';
import { RolesAccess, GetUser } from '../../../auth/decorators';
import { ROLES } from '../../../common/constants';
import { AttendEntity } from '../entities/attends.entity';
import { OrganizationChangeEntity } from '../entities/organization-change.entity';

@ApiTags('Attend')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('attend')
export class AttendController {
  constructor(private readonly attendService: AttendService) {}

  @ApiParam({ name: 'id', type: 'string' })
  @RolesAccess(ROLES.BASIC)
  @Get(':id')
  public async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<AttendEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.attendService.findOne(id),
    };
  }

  @RolesAccess(ROLES.BASIC)
  @Post()
  public async create(
    @Body() createAttendDto: CreateAttendDto,
    @GetUser('id') requesterId: string,
    @GetUser('role') requesterRole: string,
  ): Promise<ApiResponse<AttendEntity>> {
    return {
      success: true,
      statusCode: 201,
      data: await this.attendService.create(
        createAttendDto,
        requesterId,
        requesterRole,
      ),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @RolesAccess(ROLES.BASIC)
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAttendDto: UpdateAttendDto,
    @GetUser('id') requesterId: string,
    @GetUser('role') requesterRole: string,
  ): Promise<ApiResponse<AttendEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.attendService.update(
        id,
        updateAttendDto,
        requesterId,
        requesterRole,
      ),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @RolesAccess(ROLES.BASIC)
  @Delete(':id')
  public async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') requesterId: string,
    @GetUser('role') requesterRole: string,
  ): Promise<ApiResponse<null>> {
    return await this.attendService.delete(id, requesterId, requesterRole);
  }

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @RolesAccess(ROLES.BASIC)
  @Get('emergency/:emergencyId/history')
  public async findOrganizationHistory(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<ApiResponse<OrganizationChangeEntity[]>> {
    return { success: true, statusCode: 200, data: await this.attendService.findOrganizationHistory(emergencyId) };
  }

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @RolesAccess(ROLES.BASIC)
  @Get('emergency/:emergencyId')
  public async findByEmergency(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<ApiResponse<AttendEntity[]>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.attendService.findByEmergency(emergencyId),
    };
  }

  @ApiParam({ name: 'userId', type: 'string' })
  @RolesAccess(ROLES.BASIC)
  @Get('user/:userId')
  public async findByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ApiResponse<AttendEntity[]>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.attendService.findByUser(userId),
    };
  }
}
