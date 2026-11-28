/**
 * @file Unit tests for {@link GetUserUseCase}.
 */

import { describe, expect, it, vi } from 'vitest';
import { GetUserUseCase } from './get-user.use-case.js';
import { NotFoundDomainError } from '../../../shared/domain/domain-error.js';

describe('GetUserUseCase', () => {
  it('returns user when found', async () => {
    const user = { id: 'u1' } as any;
    const repo = { findById: vi.fn(async () => user) } as any;
    const useCase = new GetUserUseCase(repo);
    expect(await useCase.execute('u1')).toBe(user);
  });

  it('throws not found when missing', async () => {
    const repo = { findById: vi.fn(async () => null) } as any;
    const useCase = new GetUserUseCase(repo);
    await expect(useCase.execute('missing')).rejects.toThrow(
      NotFoundDomainError,
    );
  });
});
