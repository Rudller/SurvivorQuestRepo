import { SetMetadata } from '@nestjs/common';
import type { AuthUser } from '../auth.service';

export const ROLES_KEY = 'auth:roles';
export const Roles = (...roles: AuthUser['role'][]) => SetMetadata(ROLES_KEY, roles);
export const AdminOnly = () => Roles('admin');
export const AdminOrInstructor = () => Roles('admin', 'instructor');
