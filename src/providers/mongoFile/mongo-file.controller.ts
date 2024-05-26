import { Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { MongoFileService } from './mongo-file.service';
import { Response } from 'express';

@Controller('images')
export class MongoFileController {

    constructor(
        private readonly mongoFileService: MongoFileService
    ) { }

    @Get(':id')
    async getImage(@Param('id') id: string, @Res() res: Response): Promise<void> {
        const image = await this.mongoFileService.getImage(id);
        res.set('Content-Type', image.extension); // Establece el tipo de contenido según el formato de la imagen
        res.send(image.data);
    }
}
