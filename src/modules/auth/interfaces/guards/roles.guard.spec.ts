/**
 * @file Unit tests for {@link RolesGuard}.
 */

import { describe, expect, it, vi } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  it('reads roles metadata and allows (placeholder)', () => {
    const handler = function handler() {};
    const controller = class Controller {};
    Reflect.defineMetadata(ROLES_KEY, ['admin'], handler);

    const context = {
      getHandler: vi.fn(() => handler),
      getClass: vi.fn(() => controller),
    } as unknown as ExecutionContext;

    const guard = new RolesGuard();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('uses reflector when provided', () => {
    const reflector = {
      getAllAndOverride: vi.fn(() => ['admin']),
    } as any;
    const context = {
      getHandler: vi.fn(() => function h() {}),
      getClass: vi.fn(() => class C {}),
    } as unknown as ExecutionContext;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });
});
