import { Injectable } from '@nestjs/common';
import { Image, ImageDocument } from './models/image.model';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class MongoFileService {

    constructor(@InjectModel(Image.name) private imageModel: Model<Image>) { }

    async saveImage(foto: Buffer, fileName: string, extension: string): Promise<string> {
        const image = new this.imageModel();
        image.data = foto;
        image.filename = fileName;
        image.extension = extension;
        await image.save();
        const url = process.env.APP_URL + '/api/images/' + image._id;
        return url;
    }

    async getImage(id: string): Promise<ImageDocument> {
        const image = await this.imageModel.findById(id).exec();
        return image;
    }

}
