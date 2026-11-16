import { applyDecorators } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Política de contraseña, en un solo lugar. Antes cada DTO ponía su mínimo: activar una cuenta
 * pedía 6 caracteres, restablecerla 8 y crear un usuario 6, así que la misma contraseña valía o no
 * según por dónde entrara.
 */
export const PASSWORD_MIN_LENGTH = 8;

/** bcrypt ignora en silencio lo que pase de 72 bytes: más allá de ahí la contraseña es otra. */
export const PASSWORD_MAX_LENGTH = 72;

export const PASSWORD_RULE_TEXT = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`;

/** Valida una contraseña con la política única. Combinar con `@IsNotEmpty()` o `@IsOptional()`. */
export const IsPassword = (): PropertyDecorator =>
  applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    }),
    MaxLength(PASSWORD_MAX_LENGTH, {
      message: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`,
    }),
  );
