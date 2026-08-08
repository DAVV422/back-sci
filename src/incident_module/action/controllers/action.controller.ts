import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { CreateActionDto } from './../dto/create-action.dto';
import { ActionService } from './../services/action.service';
import { QueryDto } from './../../../common/dto/query.dto';
import { ApiResponse } from './../../../common/interfaces/responseMessage.interface';
import { GetUser } from './../../../auth/decorators';
import { ActionEntity } from './../entities/action.entity';

@ApiTags('Action')
@ApiBearerAuth()
@Controller('action')
export class ActionController {
  constructor(private readonly actionService: ActionService) {}

  @Get(':id')
  @ApiParam({ name: 'id', type: 'string' })
  public async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<ActionEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.actionService.findOne(id),
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  public async create(
    @Body() createActionDto: CreateActionDto,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<ActionEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.actionService.create(createActionDto, userId),
    };
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: 'string' })
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateActionDto: CreateActionDto,
  ): Promise<ApiResponse<ActionEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.actionService.update(id, updateActionDto),
    };
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: 'string' })
  public async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.actionService.delete(id);
    return {
      success: true,
      statusCode: 200,
      message: 'Acción eliminada.',
      data: null,
    };
  }

  @Get('emergency/:emergencyId')
  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'offset', type: 'number', required: false })
  @ApiParam({ name: 'emergencyId', type: 'string' })
  public async findByEmergency(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @Query() queryDto: QueryDto,
  ): Promise<ApiResponse<ActionEntity[]>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.actionService.findByEmergency(emergencyId),
    };
  }
}
