import { expect } from 'vitest';
import { definePortConformance } from '../conformance.js';
import { passwordHasherMemoryAdapter } from '../fixtures/memory-adapters.js';

definePortConformance(
  'PasswordHasher',
  [passwordHasherMemoryAdapter],
  (getAdapter) => {
    it('hashes and verifies a plain value', async () => {
      const adapter = getAdapter();
      const digest = await adapter.hash('secret');
      expect(await adapter.verify('secret', digest)).toBe(true);
    });

    it('rejects a mismatched plain value', async () => {
      const adapter = getAdapter();
      const digest = await adapter.hash('secret');
      expect(await adapter.verify('other', digest)).toBe(false);
    });

    it('needsRehash is callable', () => {
      const adapter = getAdapter();
      expect(typeof adapter.needsRehash('x')).toBe('boolean');
    });
  },
);
