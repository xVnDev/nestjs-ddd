/**
 * @file Typed resilience configuration slice registered via registerAs.
 */

import { registerAs } from '@nestjs/config';
import type { Env } from './env.interface.js';

/** Typed shape of the resilience configuration slice. */
export interface ResilienceConfig {
  /** Number of consecutive failures before opening the circuit. */
  failureThreshold: number;
  /** Time in ms before attempting half-open. */
  resetTimeoutMs: number;
  /** Max calls allowed in half-open state. */
  halfOpenMaxCalls: number;
  /** Whether resilience is enabled. */
  enabled: boolean;
}

/**
 * Typed resilience configuration slice.
 *
 * @returns The resilience config values derived from the environment.
 */
export const resilienceConfig = registerAs<ResilienceConfig>(
  'resilience',
  () => {
    const env = process.env as unknown as Env;
    const parsedThreshold = Number(env.BREAKER_FAILURE_THRESHOLD);
    const parsedReset = Number(env.BREAKER_RESET_TIMEOUT_MS);
    const parsedHalfOpen = Number(env.BREAKER_HALF_OPEN_MAX_CALLS);
    return {
      failureThreshold:
        Number.isFinite(parsedThreshold) && parsedThreshold > 0
          ? parsedThreshold
          : 3,
      resetTimeoutMs:
        Number.isFinite(parsedReset) && parsedReset > 0 ? parsedReset : 30000,
      halfOpenMaxCalls:
        Number.isFinite(parsedHalfOpen) && parsedHalfOpen > 0
          ? parsedHalfOpen
          : 1,
      enabled: true,
    };
  },
);

/** DI token under which the resilience config slice is registered. */
export const RESILIENCE_CONFIG = resilienceConfig.KEY;

export type ResilienceConfigType = ReturnType<typeof resilienceConfig>;
