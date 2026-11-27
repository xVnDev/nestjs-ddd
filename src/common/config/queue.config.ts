/**
 * @file Typed queue configuration slice registered via registerAs.
 */

import { registerAs } from '@nestjs/config';
import type { Env } from './env.interface.js';

/** Default exponential backoff configuration for queued jobs. */
export interface QueueBackoff {
  /** Backoff strategy. */
  type: 'exponential';
  /** Base delay in milliseconds. */
  delay: number;
}

/** Default job options applied to enqueued jobs. */
export interface QueueDefaultJobOptions {
  /** Number of attempts before a job is considered failed. */
  attempts: number;
  /** Backoff configuration used between retries. */
  backoff: QueueBackoff;
}

/** Typed shape of the queue configuration slice. */
export interface QueueConfig {
  /** Optional Redis connection URL backing the queue. */
  redisUrl?: string;
  /** Prefix applied to queue names. */
  prefix: string;
  /** Default job options applied to enqueued jobs. */
  defaultJobOptions: QueueDefaultJobOptions;
  /** Selected queue adapter. */
  adapter: 'bullmq' | 'memory';
}

/**
 * Typed queue configuration slice.
 *
 * @returns The queue config values derived from the environment.
 */
export const queueConfig = registerAs<QueueConfig>('queue', () => {
  const env = process.env as unknown as Env;
  const redisUrl = env.QUEUE_REDIS_URL || undefined;
  const parsedAttempts = Number(env.QUEUE_DEFAULT_ATTEMPTS);
  const prefix = env.QUEUE_PREFIX || 'nestjs-ddd';
  return {
    redisUrl,
    prefix,
    defaultJobOptions: {
      attempts:
        Number.isFinite(parsedAttempts) && parsedAttempts > 0
          ? parsedAttempts
          : 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
    adapter: redisUrl ? 'bullmq' : 'memory',
  };
});

/** DI token under which the queue config slice is registered. */
export const QUEUE_CONFIG = queueConfig.KEY;

export type QueueConfigType = ReturnType<typeof queueConfig>;
