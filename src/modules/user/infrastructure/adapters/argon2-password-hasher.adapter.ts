/**
 * @file Argon2id password hasher adapter.
 */

import * as argon2 from 'argon2';
import type { PasswordHasher } from '../../../shared/ports/password-hasher.port.js';

export interface Argon2Params {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}

type ConfigInput =
  | undefined
  | null
  | number
  | Argon2Params
  | { argon2?: Partial<Argon2Params>; auth?: { argon2?: Partial<Argon2Params> } }
  | { memoryCost?: number; timeCost?: number; parallelism?: number; m?: number; t?: number; p?: number; memory?: number; time?: number }
  | (() => unknown);

const DEFAULT_MEMORY_COST = 65536;
const DEFAULT_TIME_COST = 3;
const DEFAULT_PARALLELISM = 4;

export class Argon2PasswordHasherAdapter implements PasswordHasher {
  private params: Argon2Params;

  public constructor(config?: ConfigInput) {
    const raw = typeof config === 'function' ? (config as () => unknown)() : config;
    if (typeof raw === 'number') {
      this.params = {
        memoryCost: raw,
        timeCost: DEFAULT_TIME_COST,
        parallelism: DEFAULT_PARALLELISM,
      };
      return;
    }
    const obj =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const src =
      obj.argon2 && typeof obj.argon2 === 'object'
        ? (obj.argon2 as Record<string, unknown>)
        : obj.auth && typeof obj.auth === 'object' && (obj.auth as Record<string, unknown>).argon2 && typeof (obj.auth as Record<string, unknown>).argon2 === 'object'
          ? ((obj.auth as Record<string, unknown>).argon2 as Record<string, unknown>)
          : obj;
    const memoryCost = (src.memoryCost ??
      src.memory ??
      src.m ??
      obj.memoryCost ??
      obj.memory ??
      obj.m ??
      DEFAULT_MEMORY_COST) as number;
    const timeCost = (src.timeCost ??
      src.time ??
      src.t ??
      obj.timeCost ??
      obj.time ??
      obj.t ??
      DEFAULT_TIME_COST) as number;
    const parallelism = (src.parallelism ??
      src.p ??
      obj.parallelism ??
      obj.p ??
      DEFAULT_PARALLELISM) as number;
    this.params = {
      memoryCost: Number.isFinite(memoryCost) ? memoryCost : DEFAULT_MEMORY_COST,
      timeCost: Number.isFinite(timeCost) ? timeCost : DEFAULT_TIME_COST,
      parallelism: Number.isFinite(parallelism) ? parallelism : DEFAULT_PARALLELISM,
    };
  }

  private getParams(): Argon2Params {
    return this.params;
  }

  public async hash(plain: string): Promise<string> {
    const p = this.getParams();
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: p.memoryCost,
      timeCost: p.timeCost,
      parallelism: p.parallelism,
    });
  }

  public async verify(plainOrDigest: string, digestOrPlain: string): Promise<boolean> {
    let plain = plainOrDigest;
    let digest = digestOrPlain;
    if (
      typeof plainOrDigest === 'string' &&
      plainOrDigest.startsWith('$argon2') &&
      typeof digestOrPlain === 'string' &&
      !digestOrPlain.startsWith('$argon2')
    ) {
      plain = digestOrPlain;
      digest = plainOrDigest;
    }
    try {
      return await argon2.verify(digest, plain);
    } catch {
      return false;
    }
  }

  public needsRehash(digest: string): boolean {
    const p = this.getParams();
    try {
      return argon2.needsRehash(digest, {
        memoryCost: p.memoryCost,
        timeCost: p.timeCost,
        parallelism: p.parallelism,
      });
    } catch {
      return true;
    }
  }
}
