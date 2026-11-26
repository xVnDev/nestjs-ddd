import { expect, vi } from 'vitest';
import { definePortConformance } from '../conformance.js';
import { cacheMemoryAdapter } from '../fixtures/memory-adapters.js';

definePortConformance('Cache', [cacheMemoryAdapter], (getAdapter) => {
  it('set then get then del', async () => {
    const adapter = getAdapter();
    await adapter.set('k', 'v');
    expect(await adapter.get('k')).toBe('v');
    await adapter.del('k');
    expect(await adapter.get('k')).toBeNull();
    expect(vi.isMockFunction(adapter.del)).toBe(true);
  });
});
