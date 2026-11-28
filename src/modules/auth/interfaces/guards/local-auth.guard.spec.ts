/**
 * @file Unit tests for the local auth guard.
 */

import { describe, expect, it } from 'vitest';
import { HttpException } from '@nestjs/common';
import { LocalAuthGuard } from './local-auth.guard.js';

describe('LocalAuthGuard', () => {
  it('preserves Passport 400 for missing credentials', () => {
    const guard = new LocalAuthGuard();
    expect(() =>
      guard.handleRequest(null, null, { message: 'Missing credentials' }, {}, 400),
    ).toThrow(HttpException);
  });

  it('rethrows an error', () => {
    const guard = new LocalAuthGuard();
    const boom = new Error('boom');
    expect(() => guard.handleRequest(boom, null, undefined, {}, 401)).toThrow(boom);
  });

  it('returns the user when present', () => {
    const guard = new LocalAuthGuard();
    expect(guard.handleRequest(null, { id: 'user-1' } as any, undefined, {}, 200)).toMatchObject({
      id: 'user-1',
    });
  });
});
