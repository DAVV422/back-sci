import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

import { AttendService } from '../services/attends.service';
import { CreateAttendDto } from '../dto/create-attend.dto';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { AttendEntity } from '../entities/attends.entity';

@ApiTags('Attend')
@ApiBearerAuth()
@Controller('attend')
export class AttendController {
  constructor(private readonly attendService: AttendService) {}

  @ApiParam({ name: 'id', type: 'string' })
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

  @Post()
  public async create(
    @Body() createAttendDto: CreateAttendDto,
  ): Promise<ApiResponse<AttendEntity>> {
    return {
      success: true,
      statusCode: 201,
      data: await this.attendService.create(createAttendDto),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  public async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    return await this.attendService.delete(id);
  }

  @ApiParam({ name: 'emergencyId', type: 'string' })
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
