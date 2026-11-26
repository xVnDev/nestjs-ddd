import { expect } from 'vitest';
import { definePortConformance } from '../conformance.js';
import { idGeneratorMemoryAdapter } from '../fixtures/memory-adapters.js';

definePortConformance(
  'IdGenerator',
  [idGeneratorMemoryAdapter],
  (getAdapter) => {
    it('returns a string id', () => {
      expect(typeof getAdapter().next()).toBe('string');
    });
  },
);
