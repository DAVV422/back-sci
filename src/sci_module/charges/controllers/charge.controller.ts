import { Body, Controller, Get, Delete, Param, Post, Patch, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ChargeService } from './../services/charge.service';
import { CreateChargeDto } from './../dto/create-charge.dto';
import { UpdateChargeDto } from './../dto/update-charge.dto';
import { AuthGuard, RolesGuard } from './../../../auth/guards';
import { ResponseMessage } from './../../../common/interfaces/responseMessage.interface';
import { RolesAccess } from './../../../auth/decorators';
import { ROLES } from './../../../common/constants';

@ApiTags('Charge')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('charge')
export class ChargeController {
  constructor(private readonly chargeService: ChargeService) {}

  @RolesAccess(ROLES.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Crear Cargo del SCI', description: 'Este endpoint crea un cargo del sci.' })
  public async createCharge(
    @Body() createChargeDto: CreateChargeDto,
  ): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.chargeService.create(createChargeDto),
    };
  }

  @Get()
  public async findAll(): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.chargeService.findAll(),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  public async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.chargeService.findOne(id),
    };
  }

  @Get('/name/:name')
  public async findByName(
    @Param('name') name: string
  ): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.chargeService.findByName(name),
    };
  }

  @RolesAccess(ROLES.ADMIN)
  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateChargeDto: UpdateChargeDto,
  ): Promise<ResponseMessage> {
    return {
      statusCode: 200,
      data: await this.chargeService.update(id, updateChargeDto),
    };
  }

  @RolesAccess(ROLES.ADMIN)
  @ApiParam({ name: 'id', type: 'string' })
  @Delete(':id')
  public async delete(@Param('id', ParseUUIDPipe) id: string): Promise<ResponseMessage> {
    return await this.chargeService.delete(id);
  }
}
