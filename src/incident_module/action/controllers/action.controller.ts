import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateActionDto } from '../dto/create-action.dto';
import { ActionService } from '../services/action.service';
import { QueryDto } from '../../common/dto/query.dto';
import { ResponseMessage } from '../../common/interfaces/responseMessage.interface';

@ApiTags('Action')
@ApiBearerAuth()
@Controller('action')
export class ActionController {
  constructor(private readonly actionService: ActionService) {}

  @Get(':id')
  @ApiParam({ name: 'id', type: 'string' })
  public async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.actionService.findOne(id),
    };
  }

  @Post()
  public async create(@Body() createActionDto: CreateActionDto): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.actionService.create(createActionDto),
    };
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: 'string' })
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateActionDto: CreateActionDto,
  ): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.actionService.update(id, updateActionDto),
    };
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: 'string' })
  public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    await this.actionService.delete(id);
    return { statusCode: 200, message: 'Acción eliminada.' };
  }

  @Get('emergency/:emergencyId')
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'offset', type: 'number', required: false })
  @ApiParam({ name: 'emergencyId', type: 'string' })
  public async findByEmergency(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() queryDto: QueryDto,
  ): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.actionService.findByEmergency(emergencyId),
    };
  }
}
