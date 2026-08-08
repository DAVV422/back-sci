import { PartialType } from '@nestjs/mapped-types';

import { CreateDataFireDto } from './create-data-fire.dto';

export class UpdateDataFireDto extends PartialType(CreateDataFireDto) {}
