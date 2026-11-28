/**
 * @file Unit tests for {@link MemoryUserRepositoryAdapter}.
 */

import { describe, expect, it } from 'vitest';
import { MemoryUserRepositoryAdapter } from './memory-user-repository.adapter.js';
import { User } from '../../domain/entities/user.entity.js';
import { Sub } from '../../domain/value-objects/sub.vo.js';

describe('MemoryUserRepositoryAdapter', () => {
  it('saves and finds by id', async () => {
    const repo = new MemoryUserRepositoryAdapter();
    const user = new User({
      id: 'm1',
      sub: Sub.fromLocal('m'),
      email: 'm@t.com',
      passwordHash: 'h',
    });
    await repo.save(user);
    const found = await repo.findById('m1');
    expect(found?.email).toBe('m@t.com');
  });

  it('finds by sub and email', async () => {
    const repo = new MemoryUserRepositoryAdapter();
    const user = new User({
      id: 'm2',
      sub: Sub.fromLocal('m2'),
      email: 'm2@t.com',
      passwordHash: 'h',
    });
    await repo.save(user);
    expect((await repo.findBySub(Sub.fromLocal('m2')))?.id).toBe('m2');
    expect((await repo.findByEmail('m2@t.com'))?.id).toBe('m2');
  });

  it('pages results', async () => {
    const repo = new MemoryUserRepositoryAdapter();
    for (let i = 0; i < 5; i++) {
      await repo.save(
        new User({
          id: `mp${i}`,
          sub: Sub.fromLocal(`mp${i}`),
          email: `mp${i}@t.com`,
          passwordHash: 'h',
        }),
      );
    }
    const page = await repo.findAll({ page: 2, pageSize: 2 });
    expect(page.length).toBe(2);
  });

  it('soft deletes', async () => {
    const repo = new MemoryUserRepositoryAdapter();
    await repo.save(
      new User({
        id: 'md',
        sub: Sub.fromLocal('md'),
        email: 'md@t.com',
        passwordHash: 'h',
      }),
    );
    await repo.softDelete('md');
    expect(await repo.findById('md')).toBeNull();
  });
});
