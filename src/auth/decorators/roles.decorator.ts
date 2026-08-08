import { SetMetadata } from '@nestjs/common';
import { ROLES, ROLES_KEY } from '../../common/constants';

export const RolesAccess = (...roles: ROLES[]) => SetMetadata(ROLES_KEY, roles);
