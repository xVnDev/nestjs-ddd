/**
 * @file Unit tests for the Keyv Redis cache adapter.
 */

import { describe, expect, it, vi } from 'vitest';
import { KeyvRedisCacheAdapter } from './keyv-redis-cache.adapter.js';

describe('KeyvRedisCacheAdapter', () => {
  it('prefixes keys and passes TTL to Keyv set', async () => {
    const keyv = {
      get: vi.fn(async () => 'v'),
      set: vi.fn(async () => true),
      delete: vi.fn(async () => true),
      has: vi.fn(async () => true),
    };
    const adapter = new KeyvRedisCacheAdapter(keyv as never, 30);
    await adapter.set('k', 'v', 10);
    expect(keyv.set).toHaveBeenCalledWith('nestjs-ddd:k', 'v', 10000);
    const value = await adapter.get('k');
    expect(value).toBe('v');
    expect(keyv.get).toHaveBeenCalledWith('nestjs-ddd:k');
    await adapter.delete('k');
    expect(keyv.delete).toHaveBeenCalledWith('nestjs-ddd:k');
    expect(await adapter.has('k')).toBe(true);
  });

  it('uses default TTL when omitted', async () => {
    const keyv = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => true),
      delete: vi.fn(async () => true),
    };
    const adapter = new KeyvRedisCacheAdapter(keyv as never, 60);
    await adapter.set('k', 'v');
    expect(keyv.set).toHaveBeenCalledWith('nestjs-ddd:k', 'v', 60000);
  });

  it('returns null for missing keys', async () => {
    const keyv = {
      get: vi.fn(async () => undefined),
      set: vi.fn(async () => true),
      delete: vi.fn(async () => true),
    };
    const adapter = new KeyvRedisCacheAdapter(keyv as never, 30);
    expect(await adapter.get('missing')).toBeNull();
  });

  it('supports options construction and has fallback', async () => {
    const keyv = {
      get: vi.fn(async () => 'v'),
      set: vi.fn(async () => true),
      delete: vi.fn(async () => true),
    };
    const adapter = new KeyvRedisCacheAdapter(
      { keyv, defaultTtlSeconds: 5, namespace: 'ns' },
      30,
      'ignored',
    );
    await adapter.set('k', 'v');
    expect(keyv.set).toHaveBeenCalledWith('ns:k', 'v', 5000);
    expect(await adapter.has('k')).toBe(true);
  });

  it('creates an in-memory Keyv when no keyv provided', () => {
    const adapter = new KeyvRedisCacheAdapter({ defaultTtlSeconds: 7 }, 30);
    expect(adapter).toBeDefined();
  });

  it('creates a Keyv from redisUrl option', () => {
    const adapter = new KeyvRedisCacheAdapter(
      { redisUrl: 'redis://localhost:6379', defaultTtlSeconds: 7 },
      30,
    );
    expect(adapter).toBeDefined();
  });
});
