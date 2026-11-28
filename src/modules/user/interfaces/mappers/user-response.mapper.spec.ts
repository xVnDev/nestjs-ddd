/**
 * @file Unit tests for {@link toUserResponse}.
 */

import { describe, expect, it } from 'vitest';
import { User } from '../../domain/entities/user.entity.js';
import { Sub } from '../../domain/value-objects/sub.vo.js';
import { toUserResponse } from './user-response.mapper.js';

describe('toUserResponse', () => {
  it('maps aggregate to safe response', () => {
    const user = new User({
      id: 'u1',
      sub: Sub.fromLocal('abc'),
      email: 'a@b.com',
      passwordHash: 'secret-hash',
      isActive: true,
    });
    const dto = toUserResponse(user);
    expect(dto.id).toBe('u1');
    expect(dto.email).toBe('a@b.com');
    expect((dto as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    expect(Object.keys(dto)).not.toContain('passwordHash');
  });
});
