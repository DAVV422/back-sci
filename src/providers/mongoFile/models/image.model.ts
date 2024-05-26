import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type ImageDocument = HydratedDocument<Image>;

@Schema()
export class Image {
    @Prop({ type: Buffer })
    data: Buffer;

    @Prop({ required: true })
    extension: string;

    @Prop({ required: true })
    filename: string;
}

export const ImageSchema = SchemaFactory.createForClass(Image);