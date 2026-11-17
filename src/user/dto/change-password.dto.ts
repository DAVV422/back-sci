import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { IsPassword, PASSWORD_RULE_TEXT } from '../../common/validators/password.validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'MiClaveActual123',
    description:
      'Contraseña actual. Se exige para que una sesión robada no pueda cambiarla y dejar fuera a ' +
      'su dueño.',
  })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'MiClaveNueva456',
    description: `Contraseña nueva, distinta de la actual. ${PASSWORD_RULE_TEXT}`,
  })
  @IsNotEmpty()
  @IsPassword()
  newPassword: string;
}
