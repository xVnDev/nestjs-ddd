/**
 * @file Standalone TypeORM data source for the CLI and migrations.
 */

import { DataSource } from 'typeorm';
import { databaseConfig } from './database.config.js';
import type { DatabaseConfig } from './database.config.js';
import { SoftDeleteEntity } from '../../modules/shared/infrastructure/persistence/soft-delete.entity.js';

const config = databaseConfig() as unknown as DatabaseConfig;

/**
 * Standalone data source reused by TypeORM CLI commands.
 */
export const dataSource = new DataSource({
  type: 'postgres',
  url: config.url,
  ssl: config.ssl,
  poolSize: config.poolSize,
  logging: config.logging,
  synchronize: config.synchronize,
  uuidExtension: 'pgcrypto',
  entities: [SoftDeleteEntity],
  migrations: ['src/migrations/*{.ts,.js}'],
});

