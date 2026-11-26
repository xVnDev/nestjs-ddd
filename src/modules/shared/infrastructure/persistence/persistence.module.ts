/**
 * @file TypeORM PostgreSQL persistence module.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { REPOSITORY_PORT } from '../../ports/tokens.js';
import {
  databaseConfig,
  DATABASE_CONFIG,
  isDatabaseConfigured,
} from '../../../../common/config/database.config.js';
import type { DatabaseConfig as DatabaseConfigType } from '../../../../common/config/database.config.js';
import { SoftDeleteEntity } from './soft-delete.entity.js';
import { TypeOrmRepositoryAdapter } from './typeorm-repository.adapter.js';
import { InMemoryRepositoryAdapter } from './in-memory-repository.adapter.js';

/**
 * DI token for the typed database config slice.
 */
export { DATABASE_CONFIG };

@Module({
  imports: [
    ConfigModule.forFeature(databaseConfig),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forFeature(databaseConfig)],
      useFactory: (cfg: DatabaseConfigType) => ({
        type: 'postgres',
        url: cfg.url,
        ssl: cfg.ssl,
        poolSize: cfg.poolSize,
        logging: cfg.logging,
        synchronize: cfg.synchronize,
        uuidExtension: 'pgcrypto',
        autoLoadEntities: true,
      }),
      inject: [DATABASE_CONFIG],
    }),
    TypeOrmModule.forFeature([SoftDeleteEntity]),
  ],
  providers: [
    {
      provide: REPOSITORY_PORT,
      useFactory: (...args: unknown[]) =>
        isDatabaseConfigured()
          ? new TypeOrmRepositoryAdapter(args[0] as never)
          : new InMemoryRepositoryAdapter(),
      inject: isDatabaseConfigured()
        ? [getRepositoryToken(SoftDeleteEntity)]
        : [],
    },
  ],
})
/**
 * Persistence module registering TypeORM PostgreSQL.
 */
export class PersistenceModule {}
