import { expect } from 'vitest';
import { definePortConformance } from '../conformance.js';
import { clockMemoryAdapter } from '../fixtures/memory-adapters.js';

definePortConformance('Clock', [clockMemoryAdapter], (getAdapter) => {
  it('returns a Date', () => {
    expect(getAdapter().now()).toBeInstanceOf(Date);
  });
});
