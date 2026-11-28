/**
 * @file Composition root for the `user` bounded context.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { isDatabaseConfigured } from '../../common/config/database.config.js';
import { USER_REPOSITORY, PASSWORD_HASHER } from '../shared/ports/tokens.js';
import { authConfig, AUTH_CONFIG } from '../../common/config/auth.config.js';
import type { AuthConfig as AuthConfigType } from '../../common/config/auth.config.js';
import { databaseConfig, DATABASE_CONFIG } from '../../common/config/database.config.js';
import type { DatabaseConfig as DatabaseConfigType } from '../../common/config/database.config.js';
import { Argon2PasswordHasherAdapter } from './infrastructure/adapters/argon2-password-hasher.adapter.js';
import { MemoryPasswordHasherAdapter } from './infrastructure/adapters/memory-password-hasher.adapter.js';
import { TypeOrmUserRepositoryAdapter } from './infrastructure/adapters/typeorm-user-repository.adapter.js';
import { MemoryUserRepositoryAdapter } from './infrastructure/adapters/memory-user-repository.adapter.js';
import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity.js';

@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    TypeOrmModule.forFeature([UserOrmEntity]),
  ],
  providers: [
    {
      provide: PASSWORD_HASHER,
      useFactory: (cfg: AuthConfigType) => {
        if (cfg.adapter === 'argon2') {
          return new Argon2PasswordHasherAdapter(cfg);
        }
        return new MemoryPasswordHasherAdapter();
      },
      inject: [AUTH_CONFIG],
    },
    {
      provide: USER_REPOSITORY,
      useFactory: (repo: any) =>
        isDatabaseConfigured()
          ? new TypeOrmUserRepositoryAdapter(repo)
          : new MemoryUserRepositoryAdapter(),
      inject: isDatabaseConfigured() ? [getRepositoryToken(UserOrmEntity)] : [],
    },
  ],
  exports: [PASSWORD_HASHER, USER_REPOSITORY],
})
export class UserModule {}
