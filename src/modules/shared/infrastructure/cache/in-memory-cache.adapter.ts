/**
 * @file In-memory cache fallback adapter implementing the shared CACHE port.
 */

import type { Clock } from '../../ports/clock.port.js';
import type { CachePort } from '../../ports/cache.port.js';

import { cloneDeep } from 'es-toolkit';
import { isFunction, isNotNil, isPlainObject } from 'es-toolkit/predicate';

interface StoredEntry {
  value: unknown;
  expiresAt: number;
}

interface InMemoryCacheOptions {
  defaultTtlSeconds?: number;
  namespace?: string;
  clock?: Clock | { now(): Date | number };
}

function toMillis(now: Date | number): number {
  return now instanceof Date ? now.getTime() : Number(now);
}

function isClock(value: unknown): value is Clock | { now(): Date | number } {
  return (
    isNotNil(value) &&
    typeof value === 'object' &&
    isFunction((value as { now?: unknown }).now)
  );
}

function isOptions(value: unknown): value is InMemoryCacheOptions {
  if (!isPlainObject(value)) return false;
  const v = value;
  return (
    'defaultTtlSeconds' in v ||
    'namespace' in v ||
    'clock' in v ||
    'ttl' in v
  );
}

/**
 * Production-shaped in-memory cache fallback.
 *
 * Stores values in a `Map` keyed by the namespaced cache key, alongside
 * expiry timestamps. A deep-copy boundary on get/set prevents mutation leaks
 * between callers, mirroring the repository fallback adapter.
 */
export class InMemoryCacheAdapter implements CachePort {
  private readonly store = new Map<string, StoredEntry>();
  private readonly defaultTtlSeconds: number;
  private readonly namespace: string;
  private readonly clock: { now(): Date | number };

  constructor(...args: unknown[]) {
    const opts: InMemoryCacheOptions = {};
    for (const arg of args) {
      if (arg === undefined) continue;
      if (typeof arg === 'number') {
        opts.defaultTtlSeconds = arg;
      } else if (typeof arg === 'string') {
        opts.namespace = arg;
      } else if (isClock(arg)) {
        opts.clock = arg as InMemoryCacheOptions['clock'];
      } else if (isOptions(arg)) {
        const o = arg as InMemoryCacheOptions;
        if (o.defaultTtlSeconds !== undefined) opts.defaultTtlSeconds = o.defaultTtlSeconds;
        if (o.namespace !== undefined) opts.namespace = o.namespace;
        if (o.clock !== undefined) opts.clock = o.clock;
      }
    }

    this.defaultTtlSeconds = opts.defaultTtlSeconds ?? 300;
    this.namespace = opts.namespace ?? 'nestjs-ddd';
    this.clock = (opts.clock as { now(): Date | number }) ?? { now: () => new Date() };
  }

  private now(): number {
    return toMillis(this.clock.now());
  }

  private prefix(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /** {@inheritDoc CachePort.get} */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.prefix(key);
    const entry = this.store.get(fullKey);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(fullKey);
      return null;
    }
    return cloneDeep(entry.value) as T;
  }

  /** {@inheritDoc CachePort.set} */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtlSeconds;
    const fullKey = this.prefix(key);
    this.store.set(fullKey, {
      value: cloneDeep(value),
      expiresAt: this.now() + ttl * 1000,
    });
  }

  /** {@inheritDoc CachePort.delete} */
  async delete(key: string): Promise<void> {
    this.store.delete(this.prefix(key));
  }

  /** {@inheritDoc CachePort.has} */
  async has(key: string): Promise<boolean> {
    const fullKey = this.prefix(key);
    const entry = this.store.get(fullKey);
    if (!entry) return false;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(fullKey);
      return false;
    }
    return true;
  }
}
