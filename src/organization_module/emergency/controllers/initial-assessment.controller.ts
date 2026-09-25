import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

import { AuthGuard, RolesGuard } from '../../../auth/guards';
import { GetUser } from '../../../auth/decorators';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import {
  CreateInitialAssessmentDto,
  UpdateInitialAssessmentDto,
} from '../dto/';
import { InitialAssessmentEntity } from '../entities/initial-assessment.entity';
import { InitialAssessmentService } from './../services/initial-assessment.service';

@ApiTags('Emergency')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('emergency')
export class InitialAssessmentController {
  constructor(
    private readonly initialAssessmentService: InitialAssessmentService,
  ) {}

  @ApiParam({ name: 'id', type: 'string' })
  @Get(':id/assessment')
  public async findAssessment(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<InitialAssessmentEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.initialAssessmentService.findByEmergency(id),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Post(':id/assessment')
  public async createAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createAssessmentDto: CreateInitialAssessmentDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<InitialAssessmentEntity>> {
    return {
      success: true,
      statusCode: 201,
      data: await this.initialAssessmentService.create(
        id,
        createAssessmentDto,
        userId,
        userRole,
      ),
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Patch(':id/assessment')
  public async updateAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAssessmentDto: UpdateInitialAssessmentDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<InitialAssessmentEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.initialAssessmentService.update(
        id,
        updateAssessmentDto,
        userId,
        userRole,
      ),
    };
  }
}

