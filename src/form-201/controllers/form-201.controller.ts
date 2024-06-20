import { Body, Controller, Get, Delete, Param, Patch, Post, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../../auth/guards/auth.guard';
import { CreateForm201Dto } from '../dto/create-form-201.dto';
import { UpdateForm201Dto } from '../dto/update-form-201.dto';
import { Form201Service } from '../services/form-201.service';
import { ResponseMessage } from '../../common/interfaces/responseMessage.interface';

@ApiTags('Form201')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('form201')
export class Form201Controller {
  constructor(private readonly form201Service: Form201Service) {}

  @Post()
  async create(@Body() createForm201Dto: CreateForm201Dto): Promise<ResponseMessage> {
    const form201 = await this.form201Service.create(createForm201Dto);
    return { statusCode: 201, message: 'Form201 created successfully.', data: form201 };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateForm201Dto: UpdateForm201Dto,
  ): Promise<ResponseMessage> {
    const form201 = await this.form201Service.update(id, updateForm201Dto);
    return { statusCode: 200, message: 'Form201 updated successfully.', data: form201 };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    const form201 = await this.form201Service.findOne(id);
    return { statusCode: 200, message: 'Form201 found successfully.', data: form201 };
  }

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @Get('by-emergency/:emergencyId')
  async findByEmergency(@Param('emergencyId', ParseUUIDPipe) emergencyId: string): Promise<ResponseMessage> {
    const form201s = await this.form201Service.findByEmergency(emergencyId);
    return { statusCode: 200, message: 'Form201s found successfully.', data: form201s };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    await this.form201Service.delete(id);
    return { statusCode: 200, message: 'Form201 deleted successfully.' };
  }
}
