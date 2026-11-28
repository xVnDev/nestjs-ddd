/**
 * @file Unit tests for {@link DeleteUserUseCase}.
 */

import { describe, expect, it, vi } from 'vitest';
import { DeleteUserUseCase } from './delete-user.use-case.js';
import { NotFoundDomainError } from '../../../shared/domain/domain-error.js';

describe('DeleteUserUseCase', () => {
  it('soft deletes existing user', async () => {
    const repo = { findById: vi.fn(async () => ({ id: 'u1' })), softDelete: vi.fn(), save: vi.fn() } as any;
    const useCase = new DeleteUserUseCase(repo);
    await useCase.execute('u1');
    expect(repo.softDelete).toHaveBeenCalledWith('u1');
  });

  it('throws not found on missing user', async () => {
    const repo = { findById: vi.fn(async () => null), softDelete: vi.fn(), save: vi.fn() } as any;
    const useCase = new DeleteUserUseCase(repo);
    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundDomainError);
    expect(repo.softDelete).not.toHaveBeenCalled();
  });
});
