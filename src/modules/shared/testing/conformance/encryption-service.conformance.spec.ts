import { expect } from 'vitest';
import { definePortConformance } from '../conformance.js';
import { encryptionServiceMemoryAdapter } from '../fixtures/memory-adapters.js';

definePortConformance('EncryptionService', [encryptionServiceMemoryAdapter], (getAdapter) => {
  it('round-trips a value', async () => {
    const adapter = getAdapter();
    const cipher = await adapter.encrypt('plain');
    expect(await adapter.decrypt(cipher)).toBe('plain');
  });
});
