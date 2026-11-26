import { expect } from 'vitest';
import { definePortConformance } from '../conformance.js';
import { tokenIssuerMemoryAdapter } from '../fixtures/memory-adapters.js';

definePortConformance(
  'TokenIssuer',
  [tokenIssuerMemoryAdapter],
  (getAdapter) => {
    it('issues and verifies a token', async () => {
      const adapter = getAdapter();
      const token = await adapter.issue({ sub: '1' });
      expect(typeof token).toBe('string');
      const claims = await adapter.verify(token);
      expect(claims.sub).toBe('1');
    });
  },
);

it('adapter is named in-memory', () => {
  expect(tokenIssuerMemoryAdapter.name).toBe('in-memory');
});
