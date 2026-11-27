/**
 * @file Queue adapter equivalence spec.
 */

import { describe, expect, it, vi } from 'vitest';

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

import { BullmqQueueAdapter } from './bullmq-queue.adapter.js';
import { InMemoryQueueAdapter } from './in-memory-queue.adapter.js';

describe('queue equivalence', () => {
  it('runs an identical script against both adapters', async () => {
    const bullmq = new BullmqQueueAdapter();
    const memory = new InMemoryQueueAdapter();

    const bullmqEnqueue = vi.spyOn(bullmq, 'enqueue');
    const memoryEnqueue = vi.spyOn(memory, 'enqueue');

    await bullmq.enqueue('jobs', { n: 1 });
    await memory.enqueue('jobs', { n: 1 });
    expect(bullmqEnqueue).toHaveBeenCalledWith('jobs', { n: 1 });
    expect(memoryEnqueue).toHaveBeenCalledWith('jobs', { n: 1 });

    const bullmqWorker = vi.fn(async () => undefined);
    const memoryWorker = vi.fn(async () => undefined);
    void bullmq.registerWorker('jobs', bullmqWorker);
    memory.registerWorker('jobs', memoryWorker);

    await bullmq.close();
    await memory.close();
  });
});
