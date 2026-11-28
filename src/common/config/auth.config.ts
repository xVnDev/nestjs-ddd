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
  /** JWT signing algorithm. */
  algorithm: 'RS256';
  /** JWT issuer. */
  issuer: string;
  /** JWT audience. */
  audience: string;
  /** Access token TTL. */
  accessTtl: string;
  /** Refresh token TTL. */
  refreshTtl: string;
  /** Path to the RSA private key PEM. */
  privateKeyPath: string;
  /** Path to the RSA public key PEM. */
  publicKeyPath: string;
  /** Key id. */
  kid: string;
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
    algorithm: 'RS256',
    issuer: process.env.JWT_ISSUER || 'nestjs-ddd',
    audience: process.env.JWT_AUDIENCE || 'nestjs-ddd',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
    privateKeyPath: env.JWT_PRIVATE_KEY_PATH || 'keys/jwt-private.pem',
    publicKeyPath: env.JWT_PUBLIC_KEY_PATH || 'keys/jwt-public.pem',
    kid: process.env.JWT_KID || '',
  };
});

/** DI token under which the auth config slice is registered. */
export const AUTH_CONFIG = authConfig.KEY;

export type AuthConfigType = ReturnType<typeof authConfig>;
