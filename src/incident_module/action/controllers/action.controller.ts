import {
  Inject,
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
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
import { Response } from 'express';

import { CreateActionDto } from './../dto/create-action.dto';
import { CreateAudioDto } from './../dto/create-audio.dto';
import { ActionService } from './../services/action.service';
import { QueryDto } from '../../../common/dto/query.dto';
import { ApiResponse } from '../../../common/interfaces/responseMessage.interface';
import { GetUser } from '../../../auth/decorators';
import { AuthGuard, RolesGuard } from '../../../auth/guards';
import { ActionEntity } from './../entities/action.entity';
import { AUDIO_EXTENSION, audioUploadOptions } from './audio-upload.options';
import { sendStoredObject } from '../../../common/services/storage/stored-files';
import { audioKey, uniqueFileName } from '../../../common/services/storage/storage-keys';
import { IStorageService } from '../../../common/interfaces/storage.interface';

@ApiTags('Action')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('action')
export class ActionController {
  constructor(
    private readonly actionService: ActionService,
    @Inject('STORAGE_SERVICE') private readonly storageService: IStorageService,
  ) {}

  @Get('audio/:audioId')
  @ApiOperation({ summary: 'Descargar/reproducir el archivo de una nota de voz' })
  @ApiParam({ name: 'audioId', type: 'string' })
  public async streamAudio(
    @Param('audioId', ParseUUIDPipe) audioId: string,
    @Res() res: Response,
  ): Promise<void> {
    const audio = await this.actionService.getAudioFile(audioId);
    sendStoredObject(res, audio.object, { contentType: audio.mimeType, fileName: audio.fileName });
  }

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
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<ActionEntity>> {
    return {
      success: true,
      statusCode: 201,
      data: await this.actionService.create(createActionDto, userId, userRole),
    };
  }

  @Post('upload-audio/:emergencyId')
  @ApiOperation({
    summary:
      'Subir una nota de voz: se guarda en el almacenamiento bajo audios/{userId}/{emergencyId}/ y se registra como acción',
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
  @UseInterceptors(FileInterceptor('file', audioUploadOptions))
  public async uploadAudio(
    @Param('emergencyId', ParseUUIDPipe) emergencyId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string,
    @Body('duration') duration: string,
    @Body('clientGeneratedId') clientGeneratedId: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<ActionEntity>> {
    if (!file) throw new BadRequestException('Debe adjuntar el archivo de audio en el campo "file".');
    const now = new Date();
    const hour = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;

    // Extensión normalizada desde la lista blanca (ver audio-upload.options); el nombre lo genera el servidor.
    const key = audioKey(userId, emergencyId, uniqueFileName('audio', file.originalname, AUDIO_EXTENSION(file)));
    await this.storageService.put(key, file.buffer);

    const createActionDto: CreateActionDto = {
      description: description || '[Nota de voz]',
      date: now,
      hour,
      emergency: emergencyId,
      clientGeneratedId,
      audio: {
        pathAudio: key,
        duration: duration ? parseFloat(duration) : 0,
        processed: false,
        fileName: file?.originalname || file?.filename,
        mimeType: file?.mimetype,
        sizeBytes: file?.size,
        clientGeneratedId,
      },
    };

    let action: ActionEntity;
    try {
      action = await this.actionService.create(
        createActionDto,
        userId,
        userRole,
      );
    } catch (error) {
      // El archivo ya se guardó: si la acción se rechaza no debe quedar huérfano.
      await this.storageService.delete(key);
      throw error;
    }
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
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<ActionEntity>> {
    const action = await this.actionService.attachAudioToAction(
      id,
      createAudioDto,
      userId,
      userRole,
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
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<ActionEntity>> {
    return {
      success: true,
      statusCode: 200,
      data: await this.actionService.update(
        id,
        updateActionDto,
        userId,
        userRole,
      ),
    };
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: 'string' })
  public async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') userId: string,
    @GetUser('role') userRole: string,
  ): Promise<ApiResponse<null>> {
    await this.actionService.delete(id, userId, userRole);
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
