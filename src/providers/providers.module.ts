import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { Global } from '@nestjs/common/decorators/modules/global.decorator';
import { HttpCustomService } from './http/http.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Image, ImageSchema } from './mongoFile/models/image.model';
import { MongoFileService } from './mongoFile/mongo-file.service';
import { MongoFileController } from './mongoFile/mongo-file.controller';

@Global()
@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: Image.name, schema: ImageSchema }])
  ],
  providers: [HttpCustomService, MongoFileService],
  controllers: [MongoFileController],
  exports: [HttpCustomService, HttpModule, MongoFileService],
})
export class ProvidersModule {}