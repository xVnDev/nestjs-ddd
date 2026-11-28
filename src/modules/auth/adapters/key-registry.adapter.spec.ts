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
  it('caches keys and rejects an unknown kid', () => {
    const dir = mkdtempSync(join(tmpdir(), 'keys-cache-'));
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const privatePath = join(dir, 'private.pem');
    const publicPath = join(dir, 'public.pem');
    writeFileSync(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
    writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }));

    const registry = new KeyRegistryAdapter({
      privateKeyPath: privatePath,
      publicKeyPath: publicPath,
    });

    const first = registry.getSigningKey();
    const second = registry.getSigningKey();
    expect(first).toBe(second);

    const kid = registry.getCurrentKid();
    expect(registry.getPublicKey(kid)).toBeDefined();
    expect(() => registry.getPublicKey('definitely-not-the-kid')).toThrow();

    rmSync(dir, { recursive: true, force: true });
  });

  it('rejects a non-RSA private key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ec-keys-'));
    const { privateKey, publicKey } = generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    });
    const privatePath = join(dir, 'private.pem');
    const publicPath = join(dir, 'public.pem');
    writeFileSync(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
    writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }));

    const registry = new KeyRegistryAdapter({
      privateKeyPath: privatePath,
      publicKeyPath: publicPath,
    });

    expect(() => registry.getSigningKey()).toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  it('supports string constructor arguments', () => {
    const dir = mkdtempSync(join(tmpdir(), 'string-keys-'));
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const privatePath = join(dir, 'private.pem');
    const publicPath = join(dir, 'public.pem');
    writeFileSync(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
    writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }));

    const registry = new KeyRegistryAdapter(privatePath, publicPath, 'custom-kid');

    expect(registry.getSigningKey().asymmetricKeyType).toBe('rsa');
    expect(registry.getCurrentKid()).toBe('custom-kid');
    rmSync(dir, { recursive: true, force: true });
  });

  it('rejects a non-RSA public key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ec-public-keys-'));
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const privatePath = join(dir, 'private.pem');
    const publicPath = join(dir, 'public.pem');
    writeFileSync(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
    writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }));

    const registry = new KeyRegistryAdapter({
      privateKeyPath: privatePath,
      publicKeyPath: publicPath,
    });

    expect(() => registry.getPublicKey()).toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  it('uses default empty paths for missing constructor arguments', () => {
    const empty = new KeyRegistryAdapter();
    expect(() => empty.getSigningKey()).toThrow();

    const fromString = new KeyRegistryAdapter('some-private.pem');
    expect(() => fromString.getCurrentKid()).toThrow();

    const fromObject = new KeyRegistryAdapter({});
    expect(() => fromObject.getSigningKey()).toThrow();
  });

  it('caches public keys and configured kids', () => {
    const dir = mkdtempSync(join(tmpdir(), 'keys-cache-pub-'));
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const privatePath = join(dir, 'private.pem');
    const publicPath = join(dir, 'public.pem');
    writeFileSync(privatePath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
    writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }));

    const registry = new KeyRegistryAdapter(privatePath, publicPath, 'custom-kid');

    const firstPublic = registry.getPublicKey();
    const secondPublic = registry.getPublicKey();
    expect(firstPublic).toBe(secondPublic);

    const firstKid = registry.getCurrentKid();
    const secondKid = registry.getCurrentKid();
    expect(firstKid).toBe(secondKid);
    expect(firstKid).toBe('custom-kid');

    rmSync(dir, { recursive: true, force: true });
  });
});


