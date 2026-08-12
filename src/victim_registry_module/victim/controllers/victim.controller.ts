import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { VictimService } from '../services/victim.service';
import { CreateVictimDto } from '../dto/create-victim.dto';
import { UpdateVictimDto } from '../dto/update-victim.dto';
import { VictimEntity } from '../entities/victim.entity';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { AuthGuard, RolesGuard } from '../../../auth/guards';

@ApiTags('Victim')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('victim')
export class VictimController {
  constructor(private readonly victimService: VictimService) {}

  @Post()
  @ApiOperation({ summary: 'Register basic data of a victim' })
  async create(
    @Body() createVictimDto: CreateVictimDto,
  ): Promise<ApiResponse<VictimEntity>> {
    const victim = await this.victimService.create(createVictimDto);
    return {
      success: true,
      statusCode: 201,
      message: 'Víctima registrada exitosamente.',
      data: victim,
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id')
  @ApiOperation({ summary: 'Get a victim by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<VictimEntity>> {
    const victim = await this.victimService.findOne(id);
    return {
      success: true,
      statusCode: 200,
      data: victim,
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id')
  @ApiOperation({ summary: 'Update basic data of a victim' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateVictimDto: UpdateVictimDto,
  ): Promise<ApiResponse<VictimEntity>> {
    const victim = await this.victimService.update(id, updateVictimDto);
    return {
      success: true,
      statusCode: 200,
      message: 'Víctima actualizada exitosamente.',
      data: victim,
    };
  }
}
