/**
 * @file Unit tests for the local strategy.
 */

import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy.js';
import { createSeededFaker } from '../../../common/fixtures/seeded-faker.js';
import type { PasswordHasher } from '../../shared/ports/password-hasher.port.js';
import type { UserRepository } from '../../shared/ports/user-repository.port.js';

describe('LocalStrategy', () => {
  function makeUser(faker: ReturnType<typeof createSeededFaker>) {
    return {
      id: faker.string.uuid(),
      sub: { toString: () => 'local:id' },
      email: faker.internet.email().toLowerCase(),
      passwordHash: 'stored-hash',
      isActive: true,
    } as any;
  }

  it('returns the principal for valid credentials', async () => {
    const faker = createSeededFaker(2);
    const password = faker.internet.password({ length: 12 });
    const user = makeUser(faker);

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
    const user = makeUser(faker);

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

  it('keeps failure messages enumeration-equivalent', async () => {
    const faker = createSeededFaker(5);
    const user = makeUser(faker);

    const wrongPasswordStrategy = new LocalStrategy(
      { findByEmail: vi.fn().mockResolvedValue(user) } as any,
      { verify: vi.fn().mockResolvedValue(false) } as any,
    );
    const unknownEmailStrategy = new LocalStrategy(
      { findByEmail: vi.fn().mockResolvedValue(null) } as any,
      { verify: vi.fn() } as any,
    );

    const wrong = wrongPasswordStrategy
      .validate(user.email, 'wrong-password')
      .catch((error: unknown) => error);
    const unknown = unknownEmailStrategy
      .validate(faker.internet.email(), 'any-password')
      .catch((error: unknown) => error);

    const [wrongError, unknownError] = await Promise.all([wrong, unknown]);
    expect((wrongError as Error).message).toBe(
      (unknownError as Error).message,
    );
  });

  it('propagates repository errors', async () => {
    const faker = createSeededFaker(6);
    const boom = new Error('repository exploded');
    const users = { findByEmail: vi.fn().mockRejectedValue(boom) } as any;
    const hasher = { verify: vi.fn() } as any;
    const strategy = new LocalStrategy(users, hasher);

    await expect(
      strategy.validate(faker.internet.email(), 'any-password'),
    ).rejects.toBe(boom);
  });

  it('throws BadRequestException for malformed credentials', async () => {
    const users = { findByEmail: vi.fn() } as any;
    const hasher = { verify: vi.fn() } as any;
    const strategy = new LocalStrategy(users, hasher);

    await expect(strategy.validate('', 'password')).rejects.toBeInstanceOf(BadRequestException);
    await expect(strategy.validate('user@example.com', '')).rejects.toBeInstanceOf(BadRequestException);
  });
});
