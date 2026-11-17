import { SetMetadata } from '@nestjs/common';
import { PASSWORD_CHANGE_PENDING_KEY } from '../../common/constants';

/**
 * Marca una ruta como usable aunque la cuenta tenga el cambio de contraseña pendiente.
 *
 * Mientras esa marca está encendida, `AuthGuard` bloquea todo lo demás: sin el bloqueo bastaría con
 * usar la API para saltarse la pantalla y seguir trabajando con la contraseña que conoce quien creó
 * la cuenta. Solo deben llevar este decorador las rutas que hacen falta para salir del bloqueo.
 */
export const AllowWhilePasswordChangePending = () =>
  SetMetadata(PASSWORD_CHANGE_PENDING_KEY, true);
