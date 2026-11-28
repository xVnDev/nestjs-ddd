/**
 * @file Roles guard (placeholder).
 */

import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector?: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const controller = context.getClass();
    let roles: string[] | undefined;
    if (this.reflector) {
      roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        handler,
        controller,
      ]);
    } else {
      roles =
        (Reflect.getMetadata(ROLES_KEY, handler) as string[] | undefined) ??
        (Reflect.getMetadata(ROLES_KEY, controller) as string[] | undefined);
    }
    // Placeholder: real authorization lands in P05-09c.
    void roles;
    return true;
  }
}
