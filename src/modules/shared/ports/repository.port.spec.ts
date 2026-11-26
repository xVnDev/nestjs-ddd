/**
 * @file Repository port spec.
 */

import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPOSITORY_PORT } from './tokens.js';
import type { RepositoryPort } from './repository.port.js';

describe('repository port', () => {
  it('exports a single symbol token', () => {
    expect(typeof REPOSITORY_PORT).toBe('symbol');
    expect(Symbol.keyFor(REPOSITORY_PORT)).toBe('REPOSITORY_PORT');
  });

  it('type-checks a dummy implementation', () => {
    class Dummy {
      async findById(_id: string) {
        return null as { id: string } | null;
      }
      async findAll() {
        return [] as { id: string }[];
      }
      async save(entity: { id: string }) {
        return entity;
      }
      async softDelete(_id: string) {}
      async restore(_id: string) {}
      async count() {
        return 0;
      }
    }
    const repo: RepositoryPort<{ id: string }> = new Dummy();
    expect(repo).toBeDefined();
    expectTypeOf<
      RepositoryPort<{ id: string }>['findById']
    >().returns.toEqualTypeOf<Promise<{ id: string } | null>>();
  });

  it('has no typeorm import', () => {
    const content = readFileSync(
      join(
        process.cwd(),
        'src',
        'modules',
        'shared',
        'ports',
        'repository.port.ts',
      ),
      'utf8',
    );
    expect(content).not.toMatch(/typeorm/);
    const spy = vi.fn(() => content);
    expect(spy()).not.toMatch(/typeorm/);
  });
});
