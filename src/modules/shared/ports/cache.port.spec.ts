/* oxlint-disable typescript/no-redundant-type-constituents */
/**
 * @file Cache port spec.
 */

import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CACHE_PORT } from './tokens.js';
import type { CachePort } from './cache.port.js';

describe('cache port', () => {
  it('exports a unique token', () => {
    expect(typeof CACHE_PORT).toBe('symbol');
    expect(Symbol.keyFor(CACHE_PORT)).toBe('CACHE_PORT');
  });

  it('CachePort has typed get/set/delete/has', () => {
    expectTypeOf<CachePort['get']>().returns.toEqualTypeOf<Promise<unknown>>();
    expectTypeOf<CachePort['set']>().returns.toEqualTypeOf<Promise<void>>();
    expectTypeOf<CachePort['delete']>().returns.toEqualTypeOf<Promise<void>>();
    expectTypeOf<CachePort['has']>().returns.toEqualTypeOf<Promise<boolean>>();
  });

  it('is implementable with vi.fn without infrastructure', () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    expect(cache).toBeDefined();
  });

  it('has no keyv/ioredis imports', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'modules', 'shared', 'ports', 'cache.port.ts'),
      'utf8',
    );
    const reader = vi.fn(() => source);
    expect(reader).toBeDefined();
    expect(source).not.toMatch(/keyv/i);
    expect(source).not.toMatch(/ioredis/i);
  });
});
