/* oxlint-disable typescript/unbound-method */
import { expect, vi } from 'vitest';
import { definePortConformance } from '../conformance.js';
import { queueMemoryAdapter } from '../fixtures/memory-adapters.js';

definePortConformance('Queue', [queueMemoryAdapter], (getAdapter) => {
  it('enqueue resolves', async () => {
    const adapter = getAdapter();
    await adapter.enqueue('job', { x: 1 });
    expect(vi.isMockFunction(adapter.enqueue)).toBe(true);
  });
});
