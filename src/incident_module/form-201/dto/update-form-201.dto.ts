import { PartialType } from '@nestjs/swagger';
import { CreateForm201Dto } from './create-form-201.dto';

export class UpdateForm201Dto extends PartialType(CreateForm201Dto) {}
