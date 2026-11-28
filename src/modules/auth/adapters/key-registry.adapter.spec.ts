/**
 * @file Unit tests for the key registry adapter.
 */

import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { KeyRegistryAdapter } from './key-registry.adapter.js';

describe('KeyRegistryAdapter', () => {
  it('loads RSA keys from paths and resolves the kid', () => {
    const dir = mkdtempSync(join(tmpdir(), 'keys-'));
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const privatePath = join(dir, 'private.pem');
    const publicPath = join(dir, 'public.pem');
    writeFileSync(
      privatePath,
      privateKey.export({ type: 'pkcs8', format: 'pem' }),
    );
    writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }));

    const registry = new KeyRegistryAdapter({
      privateKeyPath: privatePath,
      publicKeyPath: publicPath,
    });

    const signingKey = registry.getSigningKey();
    const kid = registry.getCurrentKid();
    const publicKeyLoaded = registry.getPublicKey(kid);

    expect(signingKey.asymmetricKeyType).toBe('rsa');
    expect(publicKeyLoaded.asymmetricKeyType).toBe('rsa');
    expect(kid).toBeTruthy();

    rmSync(dir, { recursive: true, force: true });
  });

  it('throws for missing or malformed keys without echoing key bytes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bad-keys-'));
    const privatePath = join(dir, 'private.pem');
    const publicPath = join(dir, 'public.pem');
    writeFileSync(privatePath, 'not-a-key');
    writeFileSync(publicPath, 'not-a-key');

    const registry = new KeyRegistryAdapter({
      privateKeyPath: privatePath,
      publicKeyPath: publicPath,
    });

    expect(() => registry.getSigningKey()).toThrow();
    expect(() => registry.getPublicKey('wrong-kid')).toThrow();

    rmSync(dir, { recursive: true, force: true });
  });
});
