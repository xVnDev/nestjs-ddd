/**
 * @file Unit tests for {@link ListUsersUseCase}.
 */

import { describe, expect, it, vi } from 'vitest';
import { ListUsersUseCase } from './list-users.use-case.js';

describe('ListUsersUseCase', () => {
  it('forwards paging and filters', async () => {
    const items = [{ id: 'u1' }] as any;
    const repo = { findAll: vi.fn(async () => items) } as any;
    const useCase = new ListUsersUseCase(repo);
    const query = {
      page: 2,
      limit: 5,
      email: 'a@b.com',
      isActive: true,
    } as any;
    const result = await useCase.execute(query);
    expect(repo.findAll).toHaveBeenCalledWith({
      page: 2,
      pageSize: 5,
      email: 'a@b.com',
      isActive: true,
    });
    expect(result).toEqual({ items, total: 1 });
  });
});
