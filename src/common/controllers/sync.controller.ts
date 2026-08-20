import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthGuard, RolesGuard } from '../../auth/guards';
import { GetUser } from '../../auth/decorators';
import { SyncService } from '../services/sync.service';
import { SyncBatchDto, SyncOperationResult } from '../dto/sync-batch.dto';
import { ApiResponse } from '../interfaces/responseMessage.interface';

@ApiTags('Sync')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('batch')
  @ApiOperation({
    summary: 'Sincronizar cola de operaciones offline del dispositivo',
  })
  async processBatch(
    @Body() syncBatchDto: SyncBatchDto,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<{ results: SyncOperationResult[] }>> {
    const results = await this.syncService.processBatch(syncBatchDto, userId);
    return {
      success: true,
      statusCode: 200,
      message: 'Sincronización por lote procesada.',
      data: { results },
    };
  }
}
