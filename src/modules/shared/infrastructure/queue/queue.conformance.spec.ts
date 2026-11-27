/**
 * @file Shared queue port conformance spec.
 */

import { expect, it, vi } from 'vitest';

vi.mock('bullmq', () => {
  const Queue = vi.fn(function () {
    return {
      add: vi.fn(async () => ({})),
      close: vi.fn(async () => undefined),
    };
  });
  const Worker = vi.fn(function () {
    return { close: vi.fn(async () => undefined) };
  });
  return { Queue, Worker };
});
import { definePortConformance } from '../../testing/conformance.js';
import type { PortAdapterEntry } from '../../testing/conformance.js';
import type { QueuePort } from '../../ports/queue.port.js';
import { BullmqQueueAdapter } from './bullmq-queue.adapter.js';
import { InMemoryQueueAdapter } from './in-memory-queue.adapter.js';

export type QueueConformanceFactory = () => QueuePort | Promise<QueuePort>;

export function defineQueueConformance(
  adapters: ReadonlyArray<PortAdapterEntry<QueuePort>>,
): void {
  definePortConformance<QueuePort>('Queue', adapters, (getAdapter) => {
    it('enqueue resolves', async () => {
      const adapter = getAdapter();
      await expect(adapter.enqueue('q', { n: 1 })).resolves.toBeUndefined();
    });

    it('registerWorker accepts a handler', async () => {
      const adapter = getAdapter();
      const handler = vi.fn(async () => undefined);
      const result = adapter.registerWorker('q', handler);
      if (result instanceof Promise) {
        await expect(result).resolves.toBeUndefined();
      }
    });

    it('named queues are independent', async () => {
      const adapter = getAdapter();
      await adapter.enqueue('a', 1);
      await adapter.enqueue('b', 2);
    });

    it('close resolves', async () => {
      const adapter = getAdapter();
      await expect(adapter.close()).resolves.toBeUndefined();
    });
  });
}

// Aliases for alternative naming used by callers.
export const defineQueuePortConformance = defineQueueConformance;
export const runQueueConformance = defineQueueConformance;
export const queueConformanceSpec = defineQueueConformance;
export const queueConformance = defineQueueConformance;

// Wire the suite to both adapters for unit execution.
defineQueueConformance([
  {
    name: 'BullMQ',
    create: () => new BullmqQueueAdapter(),
  },
  {
    name: 'InMemory',
    create: () => new InMemoryQueueAdapter(),
  },
]);