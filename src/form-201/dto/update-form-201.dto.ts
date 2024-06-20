import { PartialType } from '@nestjs/mapped-types';

import { CreateForm201Dto } from './create-form-201.dto';

export class UpdateForm201Dto extends PartialType(CreateForm201Dto) { }
