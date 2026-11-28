/**
 * @file RS256 key registry adapter.
 */

import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import type { AuthConfig } from '../../../common/config/auth.config.js';

type KeyRegistryConfig = Partial<AuthConfig> & {
  privateKeyPath?: string;
  publicKeyPath?: string;
  kid?: string;
};

@Injectable()
export class KeyRegistryAdapter {
  private readonly privateKeyPath: string;
  private readonly publicKeyPath: string;
  private readonly configuredKid: string;
  private privateKeyCache?: KeyObject;
  private publicKeyCache?: KeyObject;
  private kidCache?: string;

  public constructor(configOrPrivateKeyPath?: KeyRegistryConfig | string, publicKeyPath?: string, kid?: string) {
    if (typeof configOrPrivateKeyPath === 'string') {
      this.privateKeyPath = configOrPrivateKeyPath;
      this.publicKeyPath = publicKeyPath ?? '';
      this.configuredKid = kid ?? '';
    } else {
      const config = configOrPrivateKeyPath ?? {};
      this.privateKeyPath = config.privateKeyPath ?? '';
      this.publicKeyPath = config.publicKeyPath ?? '';
      this.configuredKid = config.kid ?? '';
    }
  }

  public getSigningKey(): KeyObject {
    return this.loadPrivateKey();
  }

  public getPublicKey(requestedKid?: string): KeyObject {
    const currentKid = this.getCurrentKid();
    if (requestedKid && requestedKid !== currentKid) {
      throw new Error('Unknown kid');
    }
    return this.loadPublicKey();
  }

  public getCurrentKid(): string {
    if (this.kidCache) return this.kidCache;
    const publicKeyPem = readFileSync(this.publicKeyPath, 'utf8');
    const derived = this.configuredKid || createHash('sha256').update(publicKeyPem).digest('hex');
    this.kidCache = derived;
    return derived;
  }

  private loadPrivateKey(): KeyObject {
    if (this.privateKeyCache) return this.privateKeyCache;
    const pem = readFileSync(this.privateKeyPath, 'utf8');
    const key = createPrivateKey(pem);
    if (key.type !== 'private' || key.asymmetricKeyType !== 'rsa') {
      throw new Error('Invalid RSA private key');
    }
    this.privateKeyCache = key;
    return key;
  }

  private loadPublicKey(): KeyObject {
    if (this.publicKeyCache) return this.publicKeyCache;
    const pem = readFileSync(this.publicKeyPath, 'utf8');
    const key = createPublicKey(pem);
    if (key.type !== 'public' || key.asymmetricKeyType !== 'rsa') {
      throw new Error('Invalid RSA public key');
    }
    this.publicKeyCache = key;
    return key;
  }
}

