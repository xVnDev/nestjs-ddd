/**
 * @file Typed cache configuration slice registered via registerAs.
 */

import { registerAs } from '@nestjs/config';
import type { Env } from './env.interface.js';

/** Typed shape of the cache configuration slice. */
export interface CacheConfig {
  /** Namespace prefix applied to every cache key. */
  namespace: 'nestjs-ddd';
  /** Default time-to-live in seconds used when a call omits one. */
  defaultTtlSeconds: number;
  /** Optional Redis connection URL. */
  redisUrl?: string;
  /** Selected cache adapter. */
  adapter: 'redis' | 'memory';
}

/**
 * Typed cache configuration slice.
 *
 * @returns The cache config values derived from the environment.
 */
export const cacheConfig = registerAs<CacheConfig>('cache', () => {
  const env = process.env as unknown as Env;
  const redisUrl = env.CACHE_REDIS_URL || undefined;
  const parsedTtl = Number(env.CACHE_TTL_SECONDS);
  return {
    namespace: 'nestjs-ddd',
    defaultTtlSeconds:
      Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : 300,
    redisUrl,
    adapter: redisUrl ? 'redis' : 'memory',
  };
});

/** DI token under which the cache config slice is registered. */
export const CACHE_CONFIG = cacheConfig.KEY;

export type CacheConfigType = ReturnType<typeof cacheConfig>;
