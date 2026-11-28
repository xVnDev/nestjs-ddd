/**
 * @file Unit tests for {@link TypeOrmUserRepositoryAdapter}.
 */

import { describe, expect, it, vi } from 'vitest';
import { EntityManager, Repository } from 'typeorm';
import { TypeOrmUserRepositoryAdapter } from './typeorm-user-repository.adapter.js';
import { User } from '../../domain/entities/user.entity.js';
import { Sub } from '../../domain/value-objects/sub.vo.js';
import { UserOrmEntity } from '../persistence/user.orm-entity.js';
import * as Uniqueness from '../../domain/services/user-uniqueness.service.js';

describe('TypeOrmUserRepositoryAdapter', () => {
  it('maps row to aggregate on findById', async () => {
    const repo = {
      findOne: vi.fn(async () => ({
        id: 'u1',
        sub: 'local:abc',
        email: 'a@b.com',
        passwordHash: 'h',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      })),
      save: vi.fn(),
      softDelete: vi.fn(),
      find: vi.fn(),
    } as unknown as Repository<any>;
    const adapter = new TypeOrmUserRepositoryAdapter(repo);
    const user = await adapter.findById('u1');
    expect(user).not.toBeNull();
    expect(user?.email).toBe('a@b.com');
    expect(user?.sub.toString()).toBe('local:abc');
  });

  it('save consults uniqueness service', async () => {
    const spy = vi.spyOn(Uniqueness.UserUniquenessService, 'assertUnique').mockImplementation(() => undefined);
    const repo = {
      findOne: vi.fn(),
      save: vi.fn(async (row: any) => row),
      softDelete: vi.fn(),
      find: vi.fn(),
    } as unknown as Repository<any>;
    const adapter = new TypeOrmUserRepositoryAdapter(repo);
    const fakerUser = new User({
      id: 'u2',
      sub: Sub.fromLocal('abc'),
      email: 'x@y.com',
      passwordHash: 'h',
    });
    const saved = await adapter.save(fakerUser);
    expect(spy).toHaveBeenCalled();
    expect(saved.id).toBe('u2');
    spy.mockRestore();
  });

  it('softDelete does not call delete', async () => {
    const repo = {
      findOne: vi.fn(),
      save: vi.fn(),
      softDelete: vi.fn(async () => undefined),
      delete: vi.fn(),
      find: vi.fn(),
    } as unknown as Repository<any>;
    const adapter = new TypeOrmUserRepositoryAdapter(repo);
    await adapter.softDelete('u1');
    expect(repo.softDelete).toHaveBeenCalledWith('u1');
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('findAll supports paging', async () => {
    const repo = {
      findOne: vi.fn(),
      save: vi.fn(),
      softDelete: vi.fn(),
      find: vi.fn(async () => []),
    } as unknown as Repository<any>;
    const adapter = new TypeOrmUserRepositoryAdapter(repo);
    await adapter.findAll({ page: 2, pageSize: 5 });
    expect(repo.find).toHaveBeenCalledWith({ skip: 5, take: 5 });
  });

  it('findBySub and findByEmail', async () => {
    const repo = {
      findOne: vi.fn(async () => null),
      save: vi.fn(),
      softDelete: vi.fn(),
      find: vi.fn(),
    } as unknown as Repository<any>;
    const adapter = new TypeOrmUserRepositoryAdapter(repo);
    expect(await adapter.findBySub(Sub.fromLocal('abc'))).toBeNull();
    expect(await adapter.findByEmail('a@b.com')).toBeNull();
  });

  it('supports EntityManager constructor', () => {
    const repo = {
      findOne: vi.fn(async () => null),
      save: vi.fn(async (row: any) => row),
      softDelete: vi.fn(),
      find: vi.fn(async () => []),
      getRepository: vi.fn(),
    } as unknown as Repository<any>;
    const em = {
      getRepository: vi.fn(() => repo),
    } as unknown as EntityManager;
    const adapter = new TypeOrmUserRepositoryAdapter(em, UserOrmEntity);
    // entity target not UserOrmEntity; but constructor accepts any; call findById
    expect(adapter).toBeDefined();
  });
});
