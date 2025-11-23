import { Body, Controller, Get, Delete, Param, UseGuards, ParseUUIDPipe, Query, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

import { RolesAccess } from './../../../auth/decorators';
import { AuthGuard, RolesGuard } from './../../../auth/guards';
import { QueryDto } from './../../../common/dto/query.dto';
import { ResponseMessage } from './../../../common/interfaces/responseMessage.interface';
import { GetUser } from './../../../auth/decorators';
import { ROLES } from './../../../common/constants';
import { DataFireService } from './../services/dataFire.service';
import { UpdateDataFireDto } from './../dto/update-data-fire.dto';
import { CreateDataFireDto } from './../dto/create-data-fire.dto';

@ApiTags('DataFire')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('data-fire')
export class DataFireController {
  constructor(private readonly dataFireService: DataFireService) { }

  @Post()
  async createDataFire(
    @Body() createDataFireDto: CreateDataFireDto,
  ): Promise<ResponseMessage> {
    return {
      statusCode: 201,
      data: await this.dataFireService.create(createDataFireDto),
    }
  }

  @Get()
  public async findAll(@Query() queryDto: QueryDto): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.dataFireService.findAll(queryDto),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  public async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.dataFireService.findOne(id),
    }
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDataFireDto: UpdateDataFireDto): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.dataFireService.update(id, updateDataFireDto),
    };
  }

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @Get('emergency/:emergencyId')
  public async findByEmergencyId(@Param('emergencyId', ParseUUIDPipe) emergencyId: string): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.dataFireService.findByEmergencyId(emergencyId),
    };
  }

  @RolesAccess(ROLES.ADMIN)
  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return await this.dataFireService.delete(id);
  }
}
