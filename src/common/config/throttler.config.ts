/**
 * @file Typed throttler configuration slice registered via registerAs.
 */

import { registerAs } from '@nestjs/config';
import type { Env } from './env.interface.js';

/** Typed shape of the throttler configuration slice. */
export interface ThrottlerConfig {
  /** Time-to-live in milliseconds for the rate-limit window. */
  ttlMs: number;
  /** Maximum number of requests per window. */
  limit: number;
  /** Storage backend (basic: memory only). */
  storage: 'memory';
}

/**
 * Typed throttler configuration slice.
 *
 * @returns The throttler config values derived from the environment.
 */
export const throttlerConfig = registerAs<ThrottlerConfig>('throttler', () => {
  const env = process.env as unknown as Env;
  const parsedTtl = Number(env.THROTTLE_TTL_MS);
  const parsedLimit = Number(env.THROTTLE_LIMIT);
  return {
    ttlMs: Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : 60000,
    limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10,
    storage: 'memory',
  };
});

/** DI token under which the throttler config slice is registered. */
export const THROTTLER_CONFIG = throttlerConfig.KEY;

export type ThrottlerConfigType = ReturnType<typeof throttlerConfig>;
