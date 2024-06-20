import { Body, Controller, Get, Delete, Param, ParseUUIDPipe, Query, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EquipmentService } from '../services/equipment.service';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';
import { QueryDto } from '../../common/dto/query.dto';
import { ResponseMessage } from '../../common/interfaces/responseMessage.interface';
import { AuthGuard, RolesGuard } from '../../auth/guards';
import { RolesAccess } from '../../auth/decorators/roles.decorator';

@ApiTags('Equipment')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  async create(@Body() createEquipmentDto: CreateEquipmentDto): Promise<ResponseMessage> {
    const equipment = await this.equipmentService.create(createEquipmentDto);
    return {
      statusCode: 201,
      message: 'Equipo creado con éxito',
      data: equipment,
    };
  }

  @ApiQuery({ name: 'limit', type: 'number', required: false })
  @ApiQuery({ name: 'offset', type: 'number', required: false })
  @ApiQuery({ name: 'order', type: 'string', required: false })
  @ApiQuery({ name: 'attr', type: 'string', required: false })
  @ApiQuery({ name: 'value', type: 'string', required: false })
  @Get()
  async findAll(@Query() queryDto: QueryDto): Promise<ResponseMessage> {
    const equipment = await this.equipmentService.findAll(queryDto);
    return {
      statusCode: 200,
      data: equipment,
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    const equipment = await this.equipmentService.findOne(id);
    return {
      statusCode: 200,
      data: equipment,
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEquipmentDto: UpdateEquipmentDto
  ): Promise<ResponseMessage> {
    const updatedEquipment = await this.equipmentService.update(id, updateEquipmentDto);
    return {
      statusCode: 200,
      message: 'Equipo actualizado con éxito',
      data: updatedEquipment,
    };
  }

  @RolesAccess('ADMIN')
  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    const result = await this.equipmentService.delete(id);
    return {
      statusCode: 200,
      message: 'Equipo eliminado con éxito',
      data: result,
    };
  }
}
