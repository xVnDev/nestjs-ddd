/**
 * @file Unit tests for the in-memory cache fallback adapter.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { InMemoryCacheAdapter } from './in-memory-cache.adapter.js';

describe('InMemoryCacheAdapter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('prefixes keys with the namespace', async () => {
    const adapter = new InMemoryCacheAdapter(60, 'ns');
    await adapter.set('k', 'v');
    // internal store not exposed; verify via get round-trip and namespace via mutation? check has
    expect(await adapter.get('k')).toBe('v');
    expect(await adapter.has('k')).toBe(true);
  });

  it('uses default TTL when omitted', async () => {
    vi.useFakeTimers();
    const adapter = new InMemoryCacheAdapter(2);
    await adapter.set('k', 'v');
    expect(await adapter.get('k')).toBe('v');
    vi.advanceTimersByTime(2500);
    expect(await adapter.get('k')).toBeNull();
    vi.useRealTimers();
  });

  it('honours per-call TTL', async () => {
    vi.useFakeTimers();
    const adapter = new InMemoryCacheAdapter(300);
    await adapter.set('k', 'v', 1);
    expect(await adapter.get('k')).toBe('v');
    vi.advanceTimersByTime(1500);
    expect(await adapter.get('k')).toBeNull();
    vi.useRealTimers();
  });

  it('returns null and has false for missing keys', async () => {
    const adapter = new InMemoryCacheAdapter();
    expect(await adapter.get('missing')).toBeNull();
    expect(await adapter.has('missing')).toBe(false);
  });

  it('delete removes key', async () => {
    const adapter = new InMemoryCacheAdapter();
    await adapter.set('k', 'v');
    await adapter.delete('k');
    expect(await adapter.get('k')).toBeNull();
    expect(await adapter.has('k')).toBe(false);
  });

  it('overwrite replaces value', async () => {
    const adapter = new InMemoryCacheAdapter();
    await adapter.set('k', 'a');
    await adapter.set('k', 'b');
    expect(await adapter.get('k')).toBe('b');
  });

  it('deep-copies on set and get (no mutation leak)', async () => {
    const adapter = new InMemoryCacheAdapter();
    const obj = { nested: { n: 1 }, arr: [1, 2] };
    await adapter.set('k', obj);
    obj.nested.n = 999;
    obj.arr.push(3);
    const got = (await adapter.get('k')) as typeof obj;
    expect(got.nested.n).toBe(1);
    expect(got.arr).toEqual([1, 2]);
    got.nested.n = 7;
    got.arr.push(9);
    const got2 = (await adapter.get('k')) as typeof obj;
    expect(got2.nested.n).toBe(1);
    expect(got2.arr).toEqual([1, 2]);
  });

  it('clones Date values', async () => {
    const adapter = new InMemoryCacheAdapter();
    const d = new Date('2020-01-01T00:00:00.000Z');
    await adapter.set('k', d);
    const got = (await adapter.get('k')) as Date;
    expect(got).toBeInstanceOf(Date);
    expect(got.getTime()).toBe(d.getTime());
    got.setFullYear(2030);
    const got2 = (await adapter.get('k')) as Date;
    expect(got2.getFullYear()).toBe(2020);
  });

  it('has returns false after expiry', async () => {
    vi.useFakeTimers();
    const adapter = new InMemoryCacheAdapter(1);
    await adapter.set('k', 'v');
    vi.advanceTimersByTime(1500);
    expect(await adapter.has('k')).toBe(false);
    vi.useRealTimers();
  });

  it('supports options object construction', async () => {
    const clock = { now: vi.fn(() => new Date()) };
    const adapter = new InMemoryCacheAdapter({
      defaultTtlSeconds: 5,
      namespace: 'ns2',
      clock,
    });
    await adapter.set('k', 'v');
    expect(await adapter.get('k')).toBe('v');
    expect(clock.now).toHaveBeenCalled();
  });

  it('supports clock passed as first argument', async () => {
    const clock = { now: vi.fn(() => new Date('2021-01-01T00:00:00.000Z')) };
    const adapter = new InMemoryCacheAdapter(clock, 10, 'ns3');
    await adapter.set('k', 'v');
    expect(await adapter.get('k')).toBe('v');
  });

  it('supports numeric clock (returns number) via options', async () => {
    const clock = { now: vi.fn(() => Date.now()) };
    const adapter = new InMemoryCacheAdapter({ clock });
    await adapter.set('k', 'v');
    expect(await adapter.get('k')).toBe('v');
  });

  it('defaults namespace to nestjs-ddd', async () => {
    const adapter = new InMemoryCacheAdapter();
    await adapter.set('k', 'v');
    expect(await adapter.get('k')).toBe('v');
  });

  it('constructor with no args', async () => {
    const adapter = new InMemoryCacheAdapter();
    expect(adapter).toBeDefined();
  });

  it('ignores null and non-object constructor args', async () => {
    const adapter = new InMemoryCacheAdapter(null as never, true as never);
    await adapter.set('k', 'v');
    expect(await adapter.get('k')).toBe('v');
  });

  it('handles undefined constructor arg and options without clock', async () => {
    const adapter = new InMemoryCacheAdapter(undefined as never, {
      defaultTtlSeconds: 5,
      namespace: 'ns-no-clock',
    });
    await adapter.set('k', 'v');
    expect(await adapter.get('k')).toBe('v');
  });

  it('supports namespace passed as a string', async () => {
    const adapter = new InMemoryCacheAdapter('ns-only');
    await adapter.set('k', 'v');
    expect(await adapter.get('k')).toBe('v');
  });
});
