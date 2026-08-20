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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

import { CreateActionDto } from './../dto/create-action.dto';
import { CreateAudioDto } from './../dto/create-audio.dto';
import { ActionService } from './../services/action.service';
import { QueryDto } from './../../../common/dto/query.dto';
import { ApiResponse } from './../../../common/interfaces/responseMessage.interface';
import { GetUser } from './../../../auth/decorators';
import { AuthGuard, RolesGuard } from './../../../auth/guards';
import { ActionEntity } from './../entities/action.entity';

@ApiTags('Action')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('action')
export class ActionController {
  constructor(private readonly actionService: ActionService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una acción y su audio adjunto' })
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

  @Post()
  @ApiOperation({
    summary: 'Registrar una acción manual o con metadatos de audio en la bitácora',
  })
  public async create(
    @Body() createActionDto: CreateActionDto,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<ActionEntity>> {
    return {
      success: true,
      statusCode: 201,
      data: await this.actionService.create(createActionDto, userId),
    };
  }

  @Post('upload-audio/:emergencyId')
  @ApiOperation({
    summary:
      'Subir y almacenar un archivo de audio grabado en data/audios/{userId}/{emergencyId}',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de audio grabado (m4a, mp3, aac, wav, ogg)',
        },
        description: {
          type: 'string',
          example: 'Nota de voz de evaluación de sector',
        },
        duration: {
          type: 'number',
          example: 14.5,
        },
        clientGeneratedId: {
          type: 'string',
          example: '01b9bbf4-41a6-4820-abd4-9df61a2d6356',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, file, cb) => {
          const userId = req.user?.id || 'anonymous';
          const emergencyId = req.params.emergencyId || 'general';
          const uploadPath = path.join(
            process.cwd(),
            'data',
            'audios',
            userId,
            emergencyId,
          );
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
          const ext = path.extname(file.originalname) || '.m4a';
          cb(null, `audio_${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  public async uploadAudio(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string,
    @Body('duration') duration: string,
    @Body('clientGeneratedId') clientGeneratedId: string,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<ActionEntity>> {
    const now = new Date();
    const hour = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;

    const relativePath = path
      .join('data', 'audios', userId, emergencyId, file?.filename || '')
      .replace(/\\/g, '/');

    const createActionDto: CreateActionDto = {
      description: description || '[Nota de voz]',
      date: now,
      hour,
      emergency: emergencyId,
      clientGeneratedId,
      audio: {
        path_audio: relativePath,
        duration: duration ? parseFloat(duration) : 0,
        processed: false,
        file_name: file?.originalname || file?.filename,
        mime_type: file?.mimetype,
        size_bytes: file?.size,
        clientGeneratedId,
      },
    };

    const action = await this.actionService.create(createActionDto, userId);
    return {
      success: true,
      statusCode: 201,
      message: 'Audio subido y registrado como acción en bitácora.',
      data: action,
    };
  }

  @ApiParam({ name: 'id', type: 'string' })
  @Post(':id/audio')
  @ApiOperation({ summary: 'Asociar metadatos de audio a una acción existente' })
  public async attachAudio(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createAudioDto: CreateAudioDto,
    @GetUser('id') userId: string,
  ): Promise<ApiResponse<ActionEntity>> {
    const action = await this.actionService.attachAudioToAction(
      id,
      createAudioDto,
      userId,
    );
    return {
      success: true,
      statusCode: 200,
      message: 'Audio asociado a la acción.',
      data: action,
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
  @ApiOperation({
    summary: 'Obtener la línea de tiempo de acciones (con audios) de una emergencia',
  })
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
