/**
 * @file USER_REPOSITORY conformance spec across all adapters.
 */

import { expect, vi } from 'vitest';
import { definePortConformance } from '../../testing/conformance.js';
import type { UserRepository } from '../user-repository.port.js';
import { TypeOrmUserRepositoryAdapter } from '../../../user/infrastructure/adapters/typeorm-user-repository.adapter.js';
import { MemoryUserRepositoryAdapter } from '../../../user/infrastructure/adapters/memory-user-repository.adapter.js';
import { User } from '../../../user/domain/entities/user.entity.js';
import { Sub } from '../../../user/domain/value-objects/sub.vo.js';

function makeTypeOrmRepo() {
  const rows = new Map<string, any>();
  const deleted = new Set<string>();
  const repo = {
    findOne: vi.fn(async ({ where }: any) => {
      /* v8 ignore start */
      for (const row of rows.values()) {
        if (deleted.has(row.id)) continue;
        let ok = true;
        /* v8 ignore next */
        if (where?.id !== undefined && row.id !== where.id) ok = false;
        /* v8 ignore next */
        if (where?.sub !== undefined && row.sub !== where.sub) ok = false;
        /* v8 ignore next */
        if (where?.email !== undefined && row.email !== where.email) ok = false;
        /* v8 ignore next */
        if (ok) return row;
      }
      /* v8 ignore stop */
      return null;
    }),
    save: vi.fn(async (row: any) => {
      rows.set(row.id, { ...row });
      return rows.get(row.id);
    }),
    find: vi.fn(async (opts: any = {}) => {
      /* v8 ignore next */
      const skip = opts.skip ?? 0;
      /* v8 ignore next */
      const take = opts.take ?? rows.size;
      return [...rows.values()]
        .filter((r) => !deleted.has(r.id))
        .slice(skip, skip + take);
    }),
    softDelete: vi.fn(async (id: string) => {
      deleted.add(id);
    }),
  };
  return repo;
}

definePortConformance<UserRepository>(
  'UserRepository',
  [
    {
      name: 'typeorm',
      create: () => new TypeOrmUserRepositoryAdapter(makeTypeOrmRepo() as any),
    },
    { name: 'memory', create: () => new MemoryUserRepositoryAdapter() },
  ],
  (getAdapter) => {
    it('saves and finds by id', async () => {
      const adapter = getAdapter();
      const user = new User({
        id: 'u1',
        sub: Sub.fromLocal('abc'),
        email: 'a@b.com',
        passwordHash: 'h',
      });
      await adapter.save(user);
      const found = await adapter.findById('u1');
      expect(found?.email).toBe('a@b.com');
    });

    it('finds by sub', async () => {
      const adapter = getAdapter();
      const user = new User({
        id: 'u2',
        sub: Sub.fromLocal('xyz'),
        email: 'x@y.com',
        passwordHash: 'h',
      });
      await adapter.save(user);
      const found = await adapter.findBySub(Sub.fromLocal('xyz'));
      expect(found?.id).toBe('u2');
    });

    it('finds by email', async () => {
      const adapter = getAdapter();
      const user = new User({
        id: 'u3',
        sub: Sub.fromLocal('q'),
        email: 'q@r.com',
        passwordHash: 'h',
      });
      await adapter.save(user);
      const found = await adapter.findByEmail('q@r.com');
      expect(found?.id).toBe('u3');
    });

    it('pages results', async () => {
      const adapter = getAdapter();
      for (let i = 0; i < 5; i++) {
        await adapter.save(
          new User({
            id: `p${i}`,
            sub: Sub.fromLocal(`p${i}`),
            email: `p${i}@t.com`,
            passwordHash: 'h',
          }),
        );
      }
      const page = await adapter.findAll({ page: 2, pageSize: 2 });
      expect(page.length).toBe(2);
    });

    it('soft deletes', async () => {
      const adapter = getAdapter();
      const user = new User({
        id: 'd1',
        sub: Sub.fromLocal('d'),
        email: 'd@t.com',
        passwordHash: 'h',
      });
      await adapter.save(user);
      await adapter.softDelete('d1');
      expect(await adapter.findById('d1')).toBeNull();
    });
  },
);
