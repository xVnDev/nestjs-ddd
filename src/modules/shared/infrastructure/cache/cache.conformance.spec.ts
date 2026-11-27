/**
 * @file Shared cache port conformance spec.
 */

import { expect, it, vi } from 'vitest';
import Keyv from 'keyv';
import { definePortConformance } from '../../testing/conformance.js';
import type { PortAdapterEntry } from '../../testing/conformance.js';
import type { CachePort } from '../../ports/cache.port.js';
import { KeyvRedisCacheAdapter } from './keyv-redis-cache.adapter.js';
import { InMemoryCacheAdapter } from './in-memory-cache.adapter.js';

export type CacheConformanceFactory = () => CachePort | Promise<CachePort>;

export function defineCacheConformance(
  adapters: ReadonlyArray<PortAdapterEntry<CachePort>>,
): void {
  definePortConformance<CachePort>('Cache', adapters, (getAdapter) => {
    it('set then get', async () => {
      const adapter = getAdapter();
      await adapter.set('k', 'v');
      expect(await adapter.get('k')).toBe('v');
    });

    it('overwrite replaces value', async () => {
      const adapter = getAdapter();
      await adapter.set('k', 'a');
      await adapter.set('k', 'b');
      expect(await adapter.get('k')).toBe('b');
    });

    it('missing key returns null and has false', async () => {
      const adapter = getAdapter();
      expect(await adapter.get('missing')).toBeNull();
      expect(await adapter.has('missing')).toBe(false);
    });

    it('delete removes key', async () => {
      const adapter = getAdapter();
      await adapter.set('k', 'v');
      await adapter.delete('k');
      expect(await adapter.get('k')).toBeNull();
      expect(await adapter.has('k')).toBe(false);
    });

    it('has true after set', async () => {
      const adapter = getAdapter();
      await adapter.set('k', 'v');
      expect(await adapter.has('k')).toBe(true);
    });

    it('expires after TTL', async () => {
      vi.useFakeTimers();
      const adapter = getAdapter();
      await adapter.set('ttl', 'v', 1);
      expect(await adapter.get('ttl')).toBe('v');
      vi.advanceTimersByTime(1500);
      expect(await adapter.get('ttl')).toBeNull();
      vi.useRealTimers();
    });
  });
}

// Aliases for alternative naming used by callers.
export const defineCachePortConformance = defineCacheConformance;
export const runCacheConformance = defineCacheConformance;
export const cacheConformanceSpec = defineCacheConformance;
export const cacheConformance = defineCacheConformance;

// Wire the suite to both adapters for unit execution.
defineCacheConformance([
  {
    name: 'Keyv',
    create: () => new KeyvRedisCacheAdapter(new Keyv(), 1, 'nestjs-ddd'),
  },
  {
    name: 'InMemory',
    create: () => new InMemoryCacheAdapter(1, 'nestjs-ddd'),
  },
]);
