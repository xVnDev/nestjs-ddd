/**
 * @file TypeORM PostgreSQL persistence module.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig, DATABASE_CONFIG } from '../../../../common/config/database.config.js';
import type { DatabaseConfig as DatabaseConfigType } from '../../../../common/config/database.config.js';

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
        autoLoadEntities: true,
      }),
      inject: [DATABASE_CONFIG],
    }),
  ],
})
/**
 * Persistence module registering TypeORM PostgreSQL.
 */
export class PersistenceModule {}
