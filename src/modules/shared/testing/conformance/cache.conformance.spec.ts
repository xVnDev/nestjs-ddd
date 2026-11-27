import { expect, vi } from 'vitest';
import { definePortConformance } from '../conformance.js';
import { cacheMemoryAdapter } from '../fixtures/memory-adapters.js';

definePortConformance('Cache', [cacheMemoryAdapter], (getAdapter) => {
  it('set then get then delete', async () => {
    const adapter = getAdapter();
    await adapter.set('k', 'v');
    expect(await adapter.get('k')).toBe('v');
    expect(await adapter.has('k')).toBe(true);
    await adapter.delete('k');
    expect(await adapter.get('k')).toBeNull();
    expect(await adapter.has('k')).toBe(false);
    expect(vi.isMockFunction(adapter.delete)).toBe(true);
  });
});
