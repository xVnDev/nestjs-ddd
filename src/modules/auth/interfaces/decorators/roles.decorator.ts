/**
 * @file Roles decorator.
 */

import { SetMetadata } from '@nestjs/common';

/** Metadata key under which required roles are stored. */
export const ROLES_KEY = 'roles';

/** Declares the roles required to access a route. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
