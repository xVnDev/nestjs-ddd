/**
 * @file Unit tests for the login use case.
 */

import { describe, expect, it, vi } from 'vitest';
import { createSeededFaker } from '../../../common/fixtures/seeded-faker.js';
import { UnauthorizedDomainError } from '../../shared/domain/domain-error.js';
import { LoginUseCase } from './login.use-case.js';

describe('LoginUseCase', () => {
  it('returns an AuthResult for an active user', async () => {
    const faker = createSeededFaker(10);
    const principal = {
      userId: faker.string.uuid(),
      sub: { toString: () => 'local:id' },
      email: faker.internet.email(),
    } as any;

    const users = {
      findById: vi.fn().mockResolvedValue({ id: principal.userId, isActive: true }),
    } as any;
    const useCase = new LoginUseCase(users);
    const result = await useCase.execute(principal);

    expect(result.principal).toBe(principal);
    expect(typeof result.session).toBe('string');
  });

  it('throws a domain error for an inactive user', async () => {
    const faker = createSeededFaker(11);
    const principal = {
      userId: faker.string.uuid(),
      sub: { toString: () => 'local:id' },
      email: faker.internet.email(),
    } as any;

    const users = {
      findById: vi.fn().mockResolvedValue({ id: principal.userId, isActive: false }),
    } as any;
    const useCase = new LoginUseCase(users);

    await expect(useCase.execute(principal)).rejects.toBeInstanceOf(
      UnauthorizedDomainError,
    );
  });

  it('throws when the user cannot be found', async () => {
    const faker = createSeededFaker(12);
    const principal = {
      userId: faker.string.uuid(),
      sub: { toString: () => 'local:id' },
      email: faker.internet.email(),
    } as any;

    const users = { findById: vi.fn().mockResolvedValue(null) } as any;
    const useCase = new LoginUseCase(users);

    await expect(useCase.execute(principal)).rejects.toBeInstanceOf(
      UnauthorizedDomainError,
    );
  });
});
