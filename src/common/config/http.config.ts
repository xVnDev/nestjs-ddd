/**
 * @file Typed HTTP client configuration slice registered via registerAs.
 */

import { registerAs } from '@nestjs/config';
import type { Env } from './env.interface.js';

/** Typed shape of the HTTP client configuration slice. */
export interface HttpConfig {
  /** Request timeout in milliseconds. */
  timeoutMs: number;
  /** Maximum number of redirects to follow. */
  maxRedirects: number;
  /** Number of retry attempts on transient failures. */
  retryAttempts: number;
  /** Base headers applied to every request. */
  baseHeaders: Record<string, string>;
  /** User-Agent header value. */
  userAgent: string;
}

/**
 * Typed HTTP client configuration slice.
 *
 * @returns The HTTP config values derived from the environment.
 */
export const httpConfig = registerAs<HttpConfig>('http', () => {
  const env = process.env as unknown as Env;
  const parsedTimeout = Number(env.HTTP_TIMEOUT_MS);
  const parsedRedirects = Number(env.HTTP_MAX_REDIRECTS);
  const parsedRetries = Number(env.HTTP_RETRY_ATTEMPTS);
  return {
    timeoutMs:
      Number.isFinite(parsedTimeout) && parsedTimeout > 0
        ? parsedTimeout
        : 5000,
    maxRedirects:
      Number.isFinite(parsedRedirects) && parsedRedirects >= 0
        ? parsedRedirects
        : 5,
    retryAttempts:
      Number.isFinite(parsedRetries) && parsedRetries >= 0 ? parsedRetries : 3,
    baseHeaders: {},
    userAgent: 'nestjs-ddd/1.0',
  };
});

/** DI token under which the HTTP config slice is registered. */
export const HTTP_CONFIG = httpConfig.KEY;

export type HttpConfigType = ReturnType<typeof httpConfig>;
