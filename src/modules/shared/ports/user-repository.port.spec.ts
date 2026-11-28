/**
 * @file User repository port spec.
 */

import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { Sub } from '../../user/domain/value-objects/sub.vo.js';
import type { User } from '../../user/domain/entities/user.entity.js';
import type { UserRepository } from './user-repository.port.js';
import { USER_REPOSITORY } from './tokens.js';

describe('user repository port', () => {
  it('USER_REPOSITORY token is defined', () => {
    expect(USER_REPOSITORY).toBeDefined();
  });

  it('mock satisfies interface', () => {
    const mock: UserRepository = {
      save: vi.fn(async (u: User) => u),
      findById: vi.fn(async () => null),
      findBySub: vi.fn(async (_sub: Sub) => null),
      findByEmail: vi.fn(async () => null),
      findAll: vi.fn(async () => []),
      softDelete: vi.fn(async () => undefined),
    };
    expect(mock).toBeDefined();
  });

  it('has expected method signatures', () => {
    expectTypeOf<UserRepository['save']>().returns.toEqualTypeOf<Promise<User>>();
    expectTypeOf<UserRepository['findById']>().returns.toEqualTypeOf<
      Promise<User | null>
    >();
    expectTypeOf<UserRepository['findBySub']>().returns.toEqualTypeOf<
      Promise<User | null>
    >();
    expectTypeOf<UserRepository['findByEmail']>().returns.toEqualTypeOf<
      Promise<User | null>
    >();
    expectTypeOf<UserRepository['findAll']>().returns.toEqualTypeOf<
      Promise<User[]>
    >();
    expectTypeOf<UserRepository['softDelete']>().returns.toEqualTypeOf<
      Promise<void>
    >();
  });
});
