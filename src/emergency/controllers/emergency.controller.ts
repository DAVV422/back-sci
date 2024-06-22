import { Body, Controller, Get, Delete, Param, UseGuards, ParseUUIDPipe, Query, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RolesAccess } from '../../auth/decorators/roles.decorator';
import { AuthGuard, RolesGuard } from '../../auth/guards/';
import { CreateEmergencyDto, UpdateEmergencyDto } from '../dto/';
import { EmergencyService } from '../services/emergency.service';
import { QueryDto } from '../../common/dto/query.dto';
import { ResponseMessage } from 'src/common/interfaces/responseMessage.interface';
import { GetUser } from 'src/auth/decorators';

@ApiTags('Emergency')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) { }

  @Post()  
  async createEmergency(
    @Body() createEmergencyDto: CreateEmergencyDto,
    @GetUser('id') userId: string
  ): Promise<ResponseMessage> {    
    return {
      statusCode: 200,
      data: await this.emergencyService.create(createEmergencyDto, userId),
    }
  }

  @Get()
  public async findAll(@Query() queryDto: QueryDto): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.emergencyService.findAll(queryDto),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  public async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.emergencyService.findOne(id),
    }
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEmergencyDto: UpdateEmergencyDto): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.emergencyService.update(id, updateEmergencyDto),
    };
  }

  @RolesAccess('ADMIN')
  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return await this.emergencyService.delete(id);
  }
}
