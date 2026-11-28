/**
 * @file PASSWORD_HASHER conformance spec across all adapters.
 */

import { expect } from 'vitest';
import { definePortConformance } from '../../testing/conformance.js';
import type { PasswordHasher } from '../password-hasher.port.js';
import { Argon2PasswordHasherAdapter } from '../../../user/infrastructure/adapters/argon2-password-hasher.adapter.js';
import { MemoryPasswordHasherAdapter } from '../../../user/infrastructure/adapters/memory-password-hasher.adapter.js';

definePortConformance<PasswordHasher>(
  'PasswordHasher',
  [
    { name: 'argon2', create: () => new Argon2PasswordHasherAdapter() },
    { name: 'memory', create: () => new MemoryPasswordHasherAdapter(1) },
  ],
  (getAdapter) => {
    it('returns a PHC-shaped digest', async () => {
      const adapter = getAdapter();
      const digest = await adapter.hash('secret');
      expect(digest.startsWith('$')).toBe(true);
    });

    it('verifies a correct password', async () => {
      const adapter = getAdapter();
      const digest = await adapter.hash('secret');
      expect(await adapter.verify('secret', digest)).toBe(true);
    });

    it('rejects a mismatched password', async () => {
      const adapter = getAdapter();
      const digest = await adapter.hash('secret');
      expect(await adapter.verify('other', digest)).toBe(false);
    });

    it('does not leak plaintext', async () => {
      const adapter = getAdapter();
      const digest = await adapter.hash('secret');
      expect(digest.includes('secret')).toBe(false);
    });

    it('needsRehash is false for a fresh digest', async () => {
      const adapter = getAdapter();
      const digest = await adapter.hash('secret');
      expect(adapter.needsRehash(digest)).toBe(false);
    });
  },
);
