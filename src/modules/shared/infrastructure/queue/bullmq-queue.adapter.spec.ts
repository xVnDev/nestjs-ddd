/**
 * @file Unit tests for the BullMQ queue adapter.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const queueInstances: Array<{
  add: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}> = [];
const workerInstances: Array<{ close: ReturnType<typeof vi.fn> }> = [];

vi.mock('bullmq', () => {
  const Queue = vi.fn(function () {
    const instance = {
      add: vi.fn(async () => ({})),
      close: vi.fn(async () => undefined),
    };
    queueInstances.push(instance);
    return instance;
  });
  const Worker = vi.fn(function () {
    const instance = { close: vi.fn(async () => undefined), on: vi.fn() };
    workerInstances.push(instance);
    return instance;
  });
  return { Queue, Worker };
});

import { Queue, Worker } from 'bullmq';
import { BullmqQueueAdapter } from './bullmq-queue.adapter.js';

describe('BullmqQueueAdapter', () => {
  beforeEach(() => {
    queueInstances.length = 0;
    workerInstances.length = 0;
    vi.clearAllMocks();
  });

  it('creates queue with prefix and default job options', async () => {
    const adapter = new BullmqQueueAdapter('redis://localhost:6379', 'ns', {
      attempts: 2,
      backoff: { type: 'exponential', delay: 500 },
    });
    await adapter.enqueue('emails', { to: 'a' }, { delay: 10 });
    expect(Queue).toHaveBeenCalled();
    const queue = queueInstances[0];
    expect(queue.add).toHaveBeenCalledWith(
      'emails',
      { to: 'a' },
      expect.objectContaining({
        attempts: 2,
        delay: 10,
        backoff: { type: 'exponential', delay: 500 },
      }),
    );
  });

  it('uses default attempts when omitted', async () => {
    const adapter = new BullmqQueueAdapter({ prefix: 'ns2' });
    await adapter.enqueue('jobs', 42);
    const queue = queueInstances[0];
    expect(queue.add).toHaveBeenCalledWith(
      'jobs',
      42,
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('registers a worker', () => {
    const adapter = new BullmqQueueAdapter();
    const handler = vi.fn(async () => undefined);
    void adapter.registerWorker('jobs', handler);
    expect(Worker).toHaveBeenCalled();
    expect(workerInstances).toHaveLength(1);
  });

  it('does not register duplicate workers', () => {
    const adapter = new BullmqQueueAdapter();
    const handler = vi.fn(async () => undefined);
    void adapter.registerWorker('jobs', handler);
    void adapter.registerWorker('jobs', handler);
    expect(workerInstances).toHaveLength(1);
  });

  it('close drains workers and queues', async () => {
    const adapter = new BullmqQueueAdapter();
    void adapter.registerWorker(
      'jobs',
      vi.fn(async () => undefined),
    );
    await adapter.enqueue('jobs', 1);
    await adapter.close();
    expect(workerInstances[0].close).toHaveBeenCalled();
    expect(queueInstances[0].close).toHaveBeenCalled();
  });

  it('creates connection from redisUrl option', () => {
    const adapter = new BullmqQueueAdapter({
      redisUrl: 'redis://localhost:6379',
    });
    expect(adapter).toBeDefined();
  });

  it('ignores unknown constructor args', () => {
    const adapter = new BullmqQueueAdapter(42 as any, { foo: 'bar' } as any);
    expect(adapter).toBeDefined();
  });

  it('registers abandonment callback when handler exists before worker', () => {
    const adapter = new BullmqQueueAdapter();
    const handler = vi.fn(async () => undefined);
    const abandon = vi.fn();
    adapter.registerAbandonmentHandler('jobs', abandon);
    void adapter.registerWorker('jobs', handler);
    const worker = workerInstances[0];
    expect(worker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    const callback = worker.on.mock.calls[0][1];
    callback({ data: 'payload', attemptsMade: 3, opts: { attempts: 3 } });
    expect(abandon).toHaveBeenCalledWith('payload');
  });

  it('registers abandonment callback when worker exists before handler', () => {
    const adapter = new BullmqQueueAdapter();
    const handler = vi.fn(async () => undefined);
    void adapter.registerWorker('jobs', handler);
    const abandon = vi.fn();
    adapter.registerAbandonmentHandler('jobs', abandon);
    const worker = workerInstances[0];
    expect(worker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    const callback = worker.on.mock.calls[0][1];
    callback({ data: 'payload', attemptsMade: 1, opts: { attempts: 3 } });
    callback({ data: 'payload', attemptsMade: 3, opts: { attempts: 3 } });
    expect(abandon).toHaveBeenCalledWith('payload');
  });
});
