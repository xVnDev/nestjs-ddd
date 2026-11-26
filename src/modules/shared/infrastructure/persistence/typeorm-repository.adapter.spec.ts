/**
 * @file Unit tests for the TypeORM repository adapter.
 */

import { describe, expect, it, vi } from 'vitest';
import { TypeOrmRepositoryAdapter } from './typeorm-repository.adapter.js';

describe('TypeOrmRepositoryAdapter', () => {
  it('delegates all methods to the underlying repository', async () => {
    const repo = {
      findOne: vi.fn(async () => ({ id: '1' })),
      find: vi.fn(async () => [{ id: '1' }]),
      save: vi.fn(async (e: unknown) => e),
      softDelete: vi.fn(async () => undefined),
      restore: vi.fn(async () => undefined),
      count: vi.fn(async () => 2),
    };
    const adapter = new TypeOrmRepositoryAdapter(repo as never);
    expect(await adapter.findById('1')).toEqual({ id: '1' });
    expect(await adapter.findAll()).toEqual([{ id: '1' }]);
    expect(await adapter.save({ id: '1' } as never)).toEqual({ id: '1' });
    await adapter.softDelete('1');
    await adapter.restore('1');
    expect(await adapter.count()).toBe(2);
    expect(repo.softDelete).toHaveBeenCalledWith('1');
    expect(repo.restore).toHaveBeenCalledWith('1');
  });

  it('uses entity manager when provided', async () => {
    const repo = {
      findOne: vi.fn(async () => null),
      find: vi.fn(async () => []),
      save: vi.fn(async (e: unknown) => e),
      softDelete: vi.fn(async () => undefined),
      restore: vi.fn(async () => undefined),
      count: vi.fn(async () => 0),
    };
    const manager = { getRepository: vi.fn(() => repo) };
    const adapter = new TypeOrmRepositoryAdapter(
      manager as never,
      'Entity' as never,
    );
    await adapter.findById('x');
    expect(manager.getRepository).toHaveBeenCalled();
  });
});
