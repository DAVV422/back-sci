import { Body, Controller, Get, Delete, Param, Post, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

import { AttendService } from '../services/attends.service';
import { CreateAttendDto } from '../dto/create-attend.dto';
import { ResponseMessage } from '../../common/interfaces/responseMessage.interface';

@ApiTags('Attend')
@ApiBearerAuth()
@Controller('attend')
export class AttendController {
  constructor(private readonly attendService: AttendService) { }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  public async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.attendService.findOne(id),
    };
  }

  @Post()
  public async create(@Body() createAttendDto: CreateAttendDto): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.attendService.create(createAttendDto),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return await this.attendService.delete(id);
  }

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @Get('emergency/:emergencyId')
  public async findByEmergency(@Param('emergencyId', ParseUUIDPipe) emergencyId: string): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.attendService.findByEmergency(emergencyId),
    };
  }

  @ApiParam({ name: 'userId', type: 'string' })
  @Get('user/:userId')
  public async findByUser(@Param('userId', ParseUUIDPipe) userId: string): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.attendService.findByUser(userId),
    };
  }
}
