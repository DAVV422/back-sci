import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import {
  RegistrationService,
  TriageSummary,
} from '../services/registration.service';
import { CreateRegistrationDto } from '../dto/create-registration.dto';
import { RegistrationEntity } from '../entities/registration.entity';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { AuthGuard, RolesGuard } from '../../../auth/guards';
import { GetUser } from '../../../auth/decorators';

@ApiTags('Registration')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @ApiParam({ name: 'form207Id', type: 'string' })
  @Post('form207/:form207Id/registration')
  @ApiOperation({ summary: 'Register triage of a victim in a Form 207' })
  async create(
    @Param('form207Id', ParseUUIDPipe) form207Id: string,
    @Body() createRegistrationDto: CreateRegistrationDto,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<RegistrationEntity>> {
    const registration = await this.registrationService.create(
      form207Id,
      createRegistrationDto,
      userId,
      userRole,
    );
    return {
      success: true,
      statusCode: 201,
      message: 'Triage de víctima registrado exitosamente.',
      data: registration,
    };
  }

  @ApiParam({ name: 'form207Id', type: 'string' })
  @Get('form207/:form207Id/registration')
  @ApiOperation({ summary: 'List victims registered in a Form 207' })
  async findByForm207(
    @Param('form207Id', ParseUUIDPipe) form207Id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<RegistrationEntity[]>> {
    const registrations = await this.registrationService.findByForm207(form207Id, userId, userRole);
    return {
      success: true,
      statusCode: 200,
      data: registrations,
    };
  }

  @ApiParam({ name: 'victimId', type: 'string' })
  @Get('victim/:victimId/registration')
  @ApiOperation({ summary: 'Get triage history of a victim' })
  async findHistoryByVictim(
    @Param('victimId', ParseUUIDPipe) victimId: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<RegistrationEntity[]>> {
    const registrations = await this.registrationService.findHistoryByVictim(victimId, userId, userRole);
    return {
      success: true,
      statusCode: 200,
      data: registrations,
    };
  }

  @ApiParam({ name: 'emergencyId', type: 'string' })
  @Get('emergency/:emergencyId/triage-summary')
  @ApiOperation({
    summary: 'Victim count by latest triage classification for an emergency',
  })
  async getTriageSummary(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
  ): Promise<ApiResponse<TriageSummary>> {
    const summary = await this.registrationService.getTriageSummaryByEmergency(
      emergencyId,
    );
    return {
      success: true,
      statusCode: 200,
      data: summary,
    };
  }
}
