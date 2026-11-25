/**
 * @file Typed app configuration slice registered via registerAs.
 */

import { registerAs } from '@nestjs/config';
import type { Env } from './env.interface.js';

/**
 * Typed app configuration slice.
 *
 * @returns The app config values derived from the environment.
 */
export const appConfig = registerAs('app', () => {
  const env = process.env as unknown as Env;
  return {
    port: Number(env.PORT) || 3000,
    nodeEnv: env.NODE_ENV,
    apiPrefix: '/api',
  };
});

/** Typed shape of the app configuration slice. */
export type AppConfig = ReturnType<typeof appConfig>;
