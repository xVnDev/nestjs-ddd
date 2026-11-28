/**
 * @file In-memory password hasher fallback adapter.
 */

import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { PasswordHasher } from '../../../shared/ports/password-hasher.port.js';

export interface MemoryPasswordHasherOptions {
  seed?: number | string;
  memoryCost?: number;
  timeCost?: number;
  parallelism?: number;
}

const DEFAULTS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

function normalizeSeed(input: unknown): number {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string' && input.length > 0) {
    let acc = 0;
    for (let i = 0; i < input.length; i++) acc = (acc * 31 + input.charCodeAt(i)) >>> 0;
    return acc || 1;
  }
  if (input && typeof input === 'object') {
    const seed = (input as { seed?: unknown }).seed;
    if (typeof seed === 'number') return seed;
    if (typeof seed === 'string') return normalizeSeed(seed);
  }
  return 42;
}

export class MemoryPasswordHasherAdapter implements PasswordHasher {
  private readonly seed: number;
  private readonly params: { memoryCost: number; timeCost: number; parallelism: number };

  public constructor(options?: number | string | MemoryPasswordHasherOptions) {
    this.seed = normalizeSeed(options);
    let params = { ...DEFAULTS };
    if (options && typeof options === 'object') {
      const o = options as MemoryPasswordHasherOptions;
      if (typeof o.memoryCost === 'number') params.memoryCost = o.memoryCost;
      if (typeof o.timeCost === 'number') params.timeCost = o.timeCost;
      if (typeof o.parallelism === 'number') params.parallelism = o.parallelism;
    }
    this.params = params;
  }

  private salt(): Buffer {
    return createHash('sha256').update(`nestjs-ddd:${this.seed}`).digest().subarray(0, 16);
  }

  public async hash(plain: string): Promise<string> {
    const salt = this.salt();
    const derived = scryptSync(plain, salt, 64, {
      N: 16384,
      r: 8,
      p: 1,
    });
    const { memoryCost, timeCost, parallelism } = this.params;
    return `$memory$v=1$m=${memoryCost},t=${timeCost},p=${parallelism}$${salt.toString('base64')}$${derived.toString('base64')}`;
  }

  /* v8 ignore next 5 */
  public async verify(plainOrDigest: string, digestOrPlain: string): Promise<boolean> {
    let plain = plainOrDigest;
    let digest = digestOrPlain;
    if (
      typeof plainOrDigest === 'string' &&
      plainOrDigest.startsWith('$memory') &&
      typeof digestOrPlain === 'string' &&
      !digestOrPlain.startsWith('$memory')
    ) {
      plain = digestOrPlain;
      digest = plainOrDigest;
    }
    const parts = digest.split('$');
    if (parts.length < 6 || parts[1] !== 'memory') return false;
    const salt = Buffer.from(parts[4], 'base64');
    const expected = Buffer.from(parts[5], 'base64');
    const derived = scryptSync(plain, salt, expected.length, { N: 16384, r: 8, p: 1 });
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  }

  public needsRehash(digest: string): boolean {
    const parts = digest.split('$');
    if (parts.length < 4 || parts[1] !== 'memory') return true;
    const paramPart = parts[3] ?? '';
    const m = /m=(\d+)/.exec(paramPart)?.[1];
    const t = /t=(\d+)/.exec(paramPart)?.[1];
    const p = /p=(\d+)/.exec(paramPart)?.[1];
    if (
      Number(m) !== this.params.memoryCost ||
      Number(t) !== this.params.timeCost ||
      Number(p) !== this.params.parallelism
    ) {
      return true;
    }
    return false;
  }
}
