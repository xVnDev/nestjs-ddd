/**
 * @file Typed auth configuration slice registered via registerAs.
 */

import { registerAs } from '@nestjs/config';
import type { Env } from './env.interface.js';

/** Argon2id parameters. */
export interface Argon2Config {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}

/** Typed shape of the auth configuration slice. */
export interface AuthConfig {
  /** Selected password hasher adapter. */
  adapter: 'argon2' | 'memory';
  /** Argon2id parameters. */
  argon2: Argon2Config;
}

/**
 * Typed auth configuration slice.
 *
 * @returns The auth config values derived from the environment.
 */
export const authConfig = registerAs<AuthConfig>('auth', () => {
  const env = process.env as unknown as Env;
  const memoryCost = Number(process.env.ARGON2_MEMORY_COST);
  const timeCost = Number(process.env.ARGON2_TIME_COST);
  const parallelism = Number(process.env.ARGON2_PARALLELISM);
  return {
    adapter: env.NODE_ENV === 'production' ? 'argon2' : 'memory',
    argon2: {
      memoryCost:
        Number.isFinite(memoryCost) && memoryCost > 0 ? memoryCost : 65536,
      timeCost: Number.isFinite(timeCost) && timeCost > 0 ? timeCost : 3,
      parallelism:
        Number.isFinite(parallelism) && parallelism > 0 ? parallelism : 4,
    },
  };
});

/** DI token under which the auth config slice is registered. */
export const AUTH_CONFIG = authConfig.KEY;

export type AuthConfigType = ReturnType<typeof authConfig>;
