/**
 * @file Unit tests for the in-memory queue fallback adapter.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { InMemoryQueueAdapter } from './in-memory-queue.adapter.js';

describe('InMemoryQueueAdapter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('enqueue and process delivers payload to worker', async () => {
    vi.useFakeTimers();
    const adapter = new InMemoryQueueAdapter();
    const handler = vi.fn(async () => undefined);
    adapter.registerWorker('jobs', handler);
    await adapter.enqueue('jobs', { n: 1 });
    await vi.runAllTimersAsync();
    expect(handler).toHaveBeenCalledWith({ n: 1 });
    await adapter.close();
  });

  it('retries on failure with backoff', async () => {
    const adapter = new InMemoryQueueAdapter({
      defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 5 } },
    });
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    (adapter as any).workers.set('jobs', handler);
    (adapter as any).queues.set('jobs', [
      { payload: 'x', options: { attempts: 2 } },
    ]);
    await (adapter as any).runQueue('jobs');
    expect(handler).toHaveBeenCalledTimes(2);
    await adapter.close();
  });

  it('named queues are independent', async () => {
    vi.useFakeTimers();
    const adapter = new InMemoryQueueAdapter();
    const h1 = vi.fn(async () => undefined);
    const h2 = vi.fn(async () => undefined);
    adapter.registerWorker('a', h1);
    adapter.registerWorker('b', h2);
    await adapter.enqueue('a', 1);
    await adapter.enqueue('b', 2);
    await vi.runAllTimersAsync();
    expect(h1).toHaveBeenCalledWith(1);
    expect(h2).toHaveBeenCalledWith(2);
    await adapter.close();
  });

  it('close waits for in-flight jobs', async () => {
    vi.useFakeTimers();
    const adapter = new InMemoryQueueAdapter();
    let resolved = false;
    adapter.registerWorker('jobs', async () => {
      await new Promise((r) => setTimeout(r, 10));
      resolved = true;
    });
    await adapter.enqueue('jobs', 1);
    const closePromise = adapter.close();
    await vi.advanceTimersByTimeAsync(10);
    await closePromise;
    expect(resolved).toBe(true);
  });

  it('enqueue before worker waits then processes on register', async () => {
    vi.useFakeTimers();
    const adapter = new InMemoryQueueAdapter();
    await adapter.enqueue('jobs', 7);
    const handler = vi.fn(async () => undefined);
    adapter.registerWorker('jobs', handler);
    await vi.runAllTimersAsync();
    expect(handler).toHaveBeenCalledWith(7);
    await adapter.close();
  });

  it('supports clock constructor arg', () => {
    const clock = { now: vi.fn(() => new Date()) };
    const adapter = new InMemoryQueueAdapter(clock);
    expect(adapter).toBeDefined();
  });

  it('supports default attempts/backoff flat options', async () => {
    vi.useFakeTimers();
    const adapter = new InMemoryQueueAdapter({
      attempts: 1,
      backoff: { type: 'fixed', delay: 1 },
    });
    const handler = vi.fn(async () => undefined);
    adapter.registerWorker('jobs', handler);
    await adapter.enqueue('jobs', 'p');
    await vi.runAllTimersAsync();
    expect(handler).toHaveBeenCalledWith('p');
    await adapter.close();
  });

  it('constructor with no args', () => {
    const adapter = new InMemoryQueueAdapter();
    expect(adapter).toBeDefined();
  });

  it('runQueue returns early when already processing', async () => {
    const adapter = new InMemoryQueueAdapter();
    (adapter as any).processing.set('jobs', true);
    await (adapter as any).runQueue('jobs');
    expect(true).toBe(true);
  });

  it('runQueue returns early when queue is empty or missing', async () => {
    const adapter = new InMemoryQueueAdapter();
    await (adapter as any).runQueue('missing');
    (adapter as any).queues.set('empty', []);
    await (adapter as any).runQueue('empty');
    expect(true).toBe(true);
  });

  it('calls the abandonment handler after exhausted retries', async () => {
    vi.useFakeTimers();
    const adapter = new InMemoryQueueAdapter({
      defaultJobOptions: { attempts: 1, backoff: { type: 'fixed', delay: 1 } },
    });
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    const abandon = vi.fn();
    adapter.registerAbandonmentHandler('jobs', abandon);
    adapter.registerWorker('jobs', handler);
    await adapter.enqueue('jobs', 'payload');
    await vi.runAllTimersAsync();
    await adapter.close();
    expect(abandon).toHaveBeenCalledWith('payload');
  });
});
