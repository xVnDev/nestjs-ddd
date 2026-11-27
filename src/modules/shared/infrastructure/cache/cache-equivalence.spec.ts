/**
 * @file Cache adapter equivalence spec.
 */

import { describe, expect, it, vi } from 'vitest';
import Keyv from 'keyv';
import { KeyvRedisCacheAdapter } from './keyv-redis-cache.adapter.js';
import { InMemoryCacheAdapter } from './in-memory-cache.adapter.js';

describe('cache equivalence', () => {
  it('runs an identical script against both adapters with matching results', async () => {
    const keyvAdapter = new KeyvRedisCacheAdapter(new Keyv(), 5, 'nestjs-ddd');
    const memoryAdapter = new InMemoryCacheAdapter(5, 'nestjs-ddd');

    const keyvSet = vi.spyOn(keyvAdapter, 'set');
    const memorySet = vi.spyOn(memoryAdapter, 'set');
    const keyvGet = vi.spyOn(keyvAdapter, 'get');
    const memoryGet = vi.spyOn(memoryAdapter, 'get');

    await keyvAdapter.set('k', 'v', 2);
    await memoryAdapter.set('k', 'v', 2);
    expect(keyvSet).toHaveBeenCalledWith('k', 'v', 2);
    expect(memorySet).toHaveBeenCalledWith('k', 'v', 2);

    const keyvValue = await keyvAdapter.get('k');
    const memoryValue = await memoryAdapter.get('k');
    expect(keyvValue).toBe(memoryValue);
    expect(keyvGet).toHaveBeenCalledWith('k');
    expect(memoryGet).toHaveBeenCalledWith('k');

    expect(await keyvAdapter.has('k')).toBe(await memoryAdapter.has('k'));

    await keyvAdapter.delete('k');
    await memoryAdapter.delete('k');
    expect(await keyvAdapter.get('k')).toBeNull();
    expect(await memoryAdapter.get('k')).toBeNull();
    expect(await keyvAdapter.has('k')).toBe(await memoryAdapter.has('k'));
  });
});
