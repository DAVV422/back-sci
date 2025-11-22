import { PartialType } from '@nestjs/swagger';
import { CreateVictimDto } from './create-victim.dto';

export class UpdateVictimDto extends PartialType(CreateVictimDto) { }
