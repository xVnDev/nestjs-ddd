/**
 * @file Typed database configuration slice registered via registerAs.
 */

import { registerAs } from '@nestjs/config';
import type { Env } from './env.interface.js';

/** Typed shape of the database configuration slice. */
export interface DatabaseConfig {
  url: string;
  ssl: boolean;
  poolSize: number;
  logging: boolean;
  synchronize: false;
}

/**
 * Typed database configuration slice.
 *
 * @returns The database config values derived from the environment.
 */
export const databaseConfig = registerAs<DatabaseConfig>('database', () => {
  const env = process.env as unknown as Env;
  const parsedPoolSize = Number(env.DATABASE_POOL_SIZE);
  return {
    url: env.DATABASE_URL,
    ssl: env.DATABASE_SSL === 'true' || env.DATABASE_SSL === '1',
    poolSize:
      Number.isFinite(parsedPoolSize) && parsedPoolSize > 0
        ? parsedPoolSize
        : 10,
    logging: env.NODE_ENV === 'development',
    synchronize: false,
  };
});

/** DI token under which the database config slice is registered. */
export const DATABASE_CONFIG = databaseConfig.KEY;

/**
 * Indicates whether a database URL is configured.
 *
 * @returns True when DATABASE_URL is set.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
