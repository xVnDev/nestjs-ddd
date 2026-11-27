/**
 * @file Typed idempotency configuration slice registered via registerAs.
 */

import { registerAs } from '@nestjs/config';
import type { Env } from './env.interface.js';

/** Typed shape of the idempotency configuration slice. */
export interface IdempotencyConfig {
  /** Header name carrying the idempotency key. */
  headerName: 'Idempotency-Key';
  /** Cache key prefix. */
  keyPrefix: 'nestjs-ddd:idem:';
  /** Time-to-live in seconds for cached responses. */
  ttlSeconds: number;
  /** List of method+path patterns where middleware applies. */
  enabledRoutes: string[];
}

/**
 * Typed idempotency configuration slice.
 *
 * @returns The idempotency config values derived from the environment.
 */
export const idempotencyConfig = registerAs<IdempotencyConfig>(
  'idempotency',
  () => {
    const env = process.env as unknown as Env;
    const parsedTtl = Number(env.IDEMPOTENCY_TTL_SECONDS);
    return {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : 300,
      enabledRoutes: [],
    };
  },
);

/** DI token under which the idempotency config slice is registered. */
export const IDEMPOTENCY_CONFIG = idempotencyConfig.KEY;

export type IdempotencyConfigType = ReturnType<typeof idempotencyConfig>;
