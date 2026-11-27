/**
 * @file Infrastructure port spec.
 */
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { Cache, Mail, Queue } from './index.js';

describe('infrastructure ports', () => {
  it('Cache has typed get/set/delete/has', () => {
    expectTypeOf<Cache['get']>().returns.toEqualTypeOf<
      Promise<unknown | null>
    >();
    expectTypeOf<Cache['set']>().returns.toEqualTypeOf<Promise<void>>();
    expectTypeOf<Cache['delete']>().returns.toEqualTypeOf<Promise<void>>();
    expectTypeOf<Cache['has']>().returns.toEqualTypeOf<Promise<boolean>>();
  });

  it('Queue.enqueue returns void promise', () => {
    expectTypeOf<Queue['enqueue']>().returns.toEqualTypeOf<Promise<void>>();
  });

  it('Mail.send returns void promise', () => {
    expectTypeOf<Mail['send']>().returns.toEqualTypeOf<Promise<void>>();
  });

  it('vi.fn implementations need no concrete adapter', () => {
    const cache: Cache = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const queue: Queue = { enqueue: vi.fn(async () => undefined) };
    const mail: Mail = { send: vi.fn(async () => undefined) };
    expect(cache).toBeDefined();
    expect(queue).toBeDefined();
    expect(mail).toBeDefined();
  });
});
