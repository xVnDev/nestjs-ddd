/**
 * @file Unit tests for the local strategy.
 */

import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy.js';
import { createSeededFaker } from '../../../common/fixtures/seeded-faker.js';
import { PASSWORD_HASHER, USER_REPOSITORY } from '../../shared/ports/tokens.js';
import type { PasswordHasher } from '../../shared/ports/password-hasher.port.js';
import type { UserRepository } from '../../shared/ports/user-repository.port.js';

describe('LocalStrategy', () => {
  it('returns the principal for valid credentials', async () => {
    const faker = createSeededFaker(2);
    const password = faker.internet.password({ length: 12 });
    const user = {
      id: faker.string.uuid(),
      sub: { toString: () => 'local:id' },
      email: faker.internet.email().toLowerCase(),
      passwordHash: 'stored-hash',
      isActive: true,
    } as any;

    const users = {
      findByEmail: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;
    const hasher = {
      verify: vi.fn().mockResolvedValue(true),
    } as unknown as PasswordHasher;

    const strategy = new LocalStrategy(users, hasher);
    const principal = await strategy.validate(user.email, password);

    expect(principal.userId).toBe(user.id);
    expect(hasher.verify).toHaveBeenCalledWith(password, 'stored-hash');
  });

  it('throws UnauthorizedException for a wrong password', async () => {
    const faker = createSeededFaker(3);
    const user = {
      id: faker.string.uuid(),
      sub: { toString: () => 'local:id' },
      email: faker.internet.email().toLowerCase(),
      passwordHash: 'stored-hash',
      isActive: true,
    } as any;

    const users = { findByEmail: vi.fn().mockResolvedValue(user) } as any;
    const hasher = { verify: vi.fn().mockResolvedValue(false) } as any;
    const strategy = new LocalStrategy(users, hasher);

    await expect(
      strategy.validate(user.email, 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws the same error for an unknown email', async () => {
    const faker = createSeededFaker(4);
    const users = { findByEmail: vi.fn().mockResolvedValue(null) } as any;
    const hasher = { verify: vi.fn() } as any;
    const strategy = new LocalStrategy(users, hasher);

    await expect(
      strategy.validate(faker.internet.email(), 'any-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
