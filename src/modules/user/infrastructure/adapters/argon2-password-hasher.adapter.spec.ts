/**
 * @file Unit tests for {@link Argon2PasswordHasherAdapter}.
 */

import { describe, expect, it, vi } from 'vitest';
import { Argon2PasswordHasherAdapter } from './argon2-password-hasher.adapter.js';

describe('Argon2PasswordHasherAdapter', () => {
  it('hashes and verifies a correct password', async () => {
    const adapter = new Argon2PasswordHasherAdapter();
    const digest = await adapter.hash('secret');
    expect(digest.startsWith('$argon2id$')).toBe(true);
    expect(await adapter.verify('secret', digest)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const adapter = new Argon2PasswordHasherAdapter();
    const digest = await adapter.hash('secret');
    expect(await adapter.verify('other', digest)).toBe(false);
  });

  it('needsRehash flips when params change', async () => {
    const adapter = new Argon2PasswordHasherAdapter({
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    const digest = await adapter.hash('secret');
    expect(adapter.needsRehash(digest)).toBe(false);
    const changed = new Argon2PasswordHasherAdapter({
      memoryCost: 131072,
      timeCost: 3,
      parallelism: 4,
    });
    // digest produced with old params; needsRehash on changed adapter should be true
    expect(changed.needsRehash(digest)).toBe(true);
  });

  it('supports config provider function', async () => {
    const provider = vi.fn(() => ({
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    }));
    const adapter = new Argon2PasswordHasherAdapter(provider);
    const digest = await adapter.hash('secret');
    expect(await adapter.verify('secret', digest)).toBe(true);
    expect(provider).toHaveBeenCalled();
  });

  it('does not leak plaintext in digest', async () => {
    const adapter = new Argon2PasswordHasherAdapter();
    const digest = await adapter.hash('super-secret');
    expect(digest.includes('super-secret')).toBe(false);
  });

  it('verify supports reversed argument order', async () => {
    const adapter = new Argon2PasswordHasherAdapter();
    const digest = await adapter.hash('secret');
    expect(await adapter.verify(digest, 'secret')).toBe(true);
  });

  it('needsRehash true on malformed digest', () => {
    const adapter = new Argon2PasswordHasherAdapter();
    expect(adapter.needsRehash('not-a-hash')).toBe(true);
  });

  it('uses auth config object', async () => {
    const adapter = new Argon2PasswordHasherAdapter({
      argon2: { memoryCost: 65536, timeCost: 3, parallelism: 4 },
    });
    const digest = await adapter.hash('secret');
    expect(await adapter.verify('secret', digest)).toBe(true);
  });

  it('supports number config', async () => {
    const adapter = new Argon2PasswordHasherAdapter(1024);
    const digest = await adapter.hash('secret');
    expect(await adapter.verify('secret', digest)).toBe(true);
  });

  it('supports auth nested config', async () => {
    const adapter = new Argon2PasswordHasherAdapter({
      auth: { argon2: { memoryCost: 65536, timeCost: 3, parallelism: 4 } },
    });
    const digest = await adapter.hash('secret');
    expect(await adapter.verify('secret', digest)).toBe(true);
  });

  it('verify returns false on malformed digest', async () => {
    const adapter = new Argon2PasswordHasherAdapter();
    expect(await adapter.verify('secret', 'not-a-hash')).toBe(false);
  });

  it('defaults when config is null', async () => {
    const adapter = new Argon2PasswordHasherAdapter(
      null as unknown as undefined,
    );
    const digest = await adapter.hash('secret');
    expect(await adapter.verify('secret', digest)).toBe(true);
  });

  it('supports m/t/p aliases', async () => {
    const adapter = new Argon2PasswordHasherAdapter({
      m: 65536,
      t: 3,
      p: 4,
      memory: 65536,
      time: 3,
    });
    const digest = await adapter.hash('secret');
    expect(await adapter.verify('secret', digest)).toBe(true);
  });

  it('needsRehash returns true on malformed digest', () => {
    const adapter = new Argon2PasswordHasherAdapter();
    expect(adapter.needsRehash('not-a-hash')).toBe(true);
  });
});
