/**
 * @file Unit tests for {@link CreateUserUseCase}.
 */

import { describe, expect, it, vi } from 'vitest';
import { CreateUserUseCase } from './create-user.use-case.js';
import { User } from '../../domain/entities/user.entity.js';
import { UserUniquenessService } from '../../domain/services/user-uniqueness.service.js';

describe('CreateUserUseCase', () => {
  it('hashes, checks uniqueness and saves', async () => {
    const hash = vi.fn(async () => 'hashed');
    const save = vi.fn(async (u: User) => u);
    const hasher = { hash, verify: vi.fn(), needsRehash: vi.fn() };
    const repo = {
      save,
      findById: vi.fn(),
      findBySub: vi.fn(),
      findByEmail: vi.fn(),
      findAll: vi.fn(),
      softDelete: vi.fn(),
    };
    const useCase = new CreateUserUseCase(hasher as any, repo as any);
    const dto = {
      email: 'a@b.com',
      password: 'password123',
      isActive: true,
    } as any;
    const result = await useCase.execute(dto);
    expect(hash).toHaveBeenCalledWith('password123');
    expect(save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('uses provided sub when supplied', async () => {
    const hash = vi.fn(async () => 'hashed');
    const save = vi.fn(async (u: User) => u);
    const hasher = { hash, verify: vi.fn(), needsRehash: vi.fn() };
    const repo = {
      save,
      findById: vi.fn(),
      findBySub: vi.fn(),
      findByEmail: vi.fn(),
      findAll: vi.fn(),
      softDelete: vi.fn(),
    };
    const useCase = new CreateUserUseCase(hasher as any, repo as any);
    const dto = {
      email: 'a@b.com',
      password: 'password123',
      sub: 'local:provided',
      isActive: false,
    } as any;
    const result = await useCase.execute(dto);
    expect(hash).toHaveBeenCalledWith('password123');
    expect(save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('propagates duplicate error without saving', async () => {
    const hash = vi.fn(async () => 'hashed');
    const save = vi.fn();
    const hasher = { hash, verify: vi.fn(), needsRehash: vi.fn() };
    const repo = {
      save,
      findById: vi.fn(),
      findBySub: vi.fn(),
      findByEmail: vi.fn(),
      findAll: vi.fn(),
      softDelete: vi.fn(),
    };
    const spy = vi
      .spyOn(UserUniquenessService, 'assertUnique')
      .mockImplementation(() => {
        throw new Error('duplicate');
      });
    const useCase = new CreateUserUseCase(hasher as any, repo as any);
    const dto = { email: 'a@b.com', password: 'password123' } as any;
    await expect(useCase.execute(dto)).rejects.toThrow('duplicate');
    expect(save).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
