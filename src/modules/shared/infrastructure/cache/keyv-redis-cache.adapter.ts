/**
 * @file Keyv Redis cache adapter implementing the shared CACHE port.
 */

import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import type { CachePort } from '../../ports/cache.port.js';

type KeyvLike = {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttl?: number): Promise<unknown>;
  delete(key: string): Promise<boolean>;
  has?(key: string): Promise<boolean>;
};

/**
 * Keyv-backed Redis cache adapter.
 *
 * Prefixes every key with the configured namespace and converts the
 * per-call TTL (seconds) to milliseconds for Keyv.
 */
export class KeyvRedisCacheAdapter implements CachePort {
  private readonly keyv: KeyvLike;
  private readonly defaultTtlSeconds: number;
  private readonly namespace: string;

  constructor(
    keyvOrOptions:
      | KeyvLike
      | {
          keyv?: KeyvLike;
          defaultTtlSeconds?: number;
          namespace?: string;
          redisUrl?: string;
        } = {} as never,
    defaultTtlSeconds?: number,
    namespace?: string,
  ) {
    if (
      keyvOrOptions &&
      typeof keyvOrOptions === 'object' &&
      ('get' in keyvOrOptions || 'set' in keyvOrOptions)
    ) {
      this.keyv = keyvOrOptions as KeyvLike;
      this.defaultTtlSeconds = defaultTtlSeconds ?? 300;
      this.namespace = namespace ?? 'nestjs-ddd';
    } else {
      const opts = (keyvOrOptions ?? {}) as {
        keyv?: KeyvLike;
        defaultTtlSeconds?: number;
        namespace?: string;
        redisUrl?: string;
      };
      if (opts.keyv) {
        this.keyv = opts.keyv;
      } else if (opts.redisUrl) {
        this.keyv = new Keyv(
          new KeyvRedis(opts.redisUrl),
        ) as unknown as KeyvLike;
      } else {
        this.keyv = new Keyv() as unknown as KeyvLike;
      }
      this.defaultTtlSeconds =
        opts.defaultTtlSeconds ?? defaultTtlSeconds ?? 300;
      this.namespace = opts.namespace ?? namespace ?? 'nestjs-ddd';
    }
  }

  /** {@inheritDoc CachePort.get} */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.keyv.get(this.prefix(key));
    if (value === undefined || value === null) {
      return null;
    }
    return value as T;
  }

  /** {@inheritDoc CachePort.set} */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    await this.keyv.set(this.prefix(key), value, ttl * 1000);
  }

  /** {@inheritDoc CachePort.delete} */
  async delete(key: string): Promise<void> {
    await this.keyv.delete(this.prefix(key));
  }

  /** {@inheritDoc CachePort.has} */
  async has(key: string): Promise<boolean> {
    if (typeof this.keyv.has === 'function') {
      return Boolean(await this.keyv.has(this.prefix(key)));
    }
    const value = await this.keyv.get(this.prefix(key));
    return value !== undefined && value !== null;
  }

  private prefix(key: string): string {
    return `${this.namespace}:${key}`;
  }
}
