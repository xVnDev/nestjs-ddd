/**
 * @file Queue port spec.
 */

import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QUEUE } from './tokens.js';
import type { QueuePort } from './queue.port.js';

describe('queue port', () => {
  it('exports a unique token', () => {
    expect(typeof QUEUE).toBe('symbol');
    expect(Symbol.keyFor(QUEUE)).toBe('QUEUE');
  });

  it('QueuePort has typed enqueue/registerWorker/close', () => {
    expectTypeOf<QueuePort['enqueue']>().returns.toEqualTypeOf<Promise<void>>();
    expectTypeOf<QueuePort['registerWorker']>().returns.toEqualTypeOf<
      void | Promise<void>
    >();
    expectTypeOf<QueuePort['close']>().returns.toEqualTypeOf<Promise<void>>();
  });

  it('is implementable with vi.fn without infrastructure', () => {
    const queue: QueuePort = {
      enqueue: vi.fn(async () => undefined),
      registerWorker: vi.fn(() => undefined),
      close: vi.fn(async () => undefined),
    };
    expect(queue).toBeDefined();
  });

  it('has no bullmq/ioredis imports', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'modules', 'shared', 'ports', 'queue.port.ts'),
      'utf8',
    );
    const reader = vi.fn(() => source);
    expect(reader).toBeDefined();
    expect(source).not.toMatch(/bullmq/i);
    expect(source).not.toMatch(/ioredis/i);
  });
});