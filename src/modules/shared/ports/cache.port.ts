/**
 * @file Cache port.
 */

/**
 * Narrow cache port over serialisable values.
 *
 * Implementations must be swappable behind the {@link CACHE_PORT} token.
 */
export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

/** Backwards-compatible alias for the cache port. */
export type Cache = CachePort;
