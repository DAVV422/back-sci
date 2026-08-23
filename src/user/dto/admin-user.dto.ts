import { ApiProperty } from '@nestjs/swagger';
import { UserDTO } from './user.dto';
import { UserEntity } from '../entities/user.entity';

export class AdminUserDto extends UserDTO {
  @ApiProperty({
    example: '2026-08-23T20:21:21.724Z',
    type: Date,
    description: 'Fecha de creación del usuario',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-08-23T21:45:05.522Z',
    type: Date,
    description: 'Fecha de última actualización del usuario',
  })
  updatedAt: Date;

  public constructor(user: UserEntity) {
    super(user);
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
