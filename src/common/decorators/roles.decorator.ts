// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { RoleEnum } from '../constants/roles.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleEnum[]) => SetMetadata(ROLES_KEY, roles);
