/**
 * @file Unit tests for {@link UpdateUserUseCase}.
 */

import { describe, expect, it, vi } from 'vitest';
import { UpdateUserUseCase } from './update-user.use-case.js';
import { NotFoundDomainError } from '../../../shared/domain/domain-error.js';

describe('UpdateUserUseCase', () => {
  it('updates fields and re-hashes password', async () => {
    const user = {
      id: 'u1',
      changeEmail: vi.fn(),
      setPasswordHash: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      sub: { toString: () => 's' },
    } as any;
    const repo = {
      findById: vi.fn(async () => user),
      save: vi.fn(async (u: any) => u),
      softDelete: vi.fn(),
    } as any;
    const hasher = {
      hash: vi.fn(async () => 'new-hash'),
      verify: vi.fn(),
      needsRehash: vi.fn(),
    } as any;
    const useCase = new UpdateUserUseCase(hasher, repo);
    const dto = {
      email: 'x@y.com',
      password: 'newpass123',
      isActive: false,
      sub: 'local:new',
    } as any;
    await useCase.execute('u1', dto);
    expect(user.changeEmail).toHaveBeenCalledWith('x@y.com');
    expect(hasher.hash).toHaveBeenCalledWith('newpass123');
    expect(user.setPasswordHash).toHaveBeenCalledWith('new-hash');
    expect(user.deactivate).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
  });

  it('throws not found on missing user', async () => {
    const repo = {
      findById: vi.fn(async () => null),
      save: vi.fn(),
      softDelete: vi.fn(),
    } as any;
    const hasher = {
      hash: vi.fn(),
      verify: vi.fn(),
      needsRehash: vi.fn(),
    } as any;
    const useCase = new UpdateUserUseCase(hasher, repo);
    await expect(useCase.execute('missing', {} as any)).rejects.toThrow(
      NotFoundDomainError,
    );
  });

  it('activates user when isActive true and skips email change when omitted', async () => {
    const user = {
      id: 'u1',
      changeEmail: vi.fn(),
      setPasswordHash: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      sub: { toString: () => 's' },
    } as any;
    const repo = {
      findById: vi.fn(async () => user),
      save: vi.fn(async (u: any) => u),
      softDelete: vi.fn(),
    } as any;
    const hasher = {
      hash: vi.fn(),
      verify: vi.fn(),
      needsRehash: vi.fn(),
    } as any;
    const useCase = new UpdateUserUseCase(hasher, repo);
    await useCase.execute('u1', { isActive: true, sub: 'local:new' } as any);
    expect(user.activate).toHaveBeenCalled();
    expect(user.changeEmail).not.toHaveBeenCalled();
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
  });

  it('does not re-hash when no password', async () => {
    const user = {
      id: 'u1',
      changeEmail: vi.fn(),
      setPasswordHash: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      sub: { toString: () => 's' },
    } as any;
    const repo = {
      findById: vi.fn(async () => user),
      save: vi.fn(async (u: any) => u),
      softDelete: vi.fn(),
    } as any;
    const hasher = {
      hash: vi.fn(),
      verify: vi.fn(),
      needsRehash: vi.fn(),
    } as any;
    const useCase = new UpdateUserUseCase(hasher, repo);
    await useCase.execute('u1', { email: 'x@y.com' } as any);
    expect(hasher.hash).not.toHaveBeenCalled();
  });
});
