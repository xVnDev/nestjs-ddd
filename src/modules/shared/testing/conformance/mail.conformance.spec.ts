/* oxlint-disable typescript/unbound-method */
import { expect, vi } from 'vitest';
import { definePortConformance } from '../conformance.js';
import { mailMemoryAdapter } from '../fixtures/memory-adapters.js';

definePortConformance('Mail', [mailMemoryAdapter], (getAdapter) => {
  it('send resolves', async () => {
    const adapter = getAdapter();
    await adapter.send({ to: 'a@b.com', subject: 'hi' });
    expect(vi.isMockFunction(adapter.send)).toBe(true);
  });
});

