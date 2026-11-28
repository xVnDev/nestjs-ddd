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
import { Argon2PasswordHasherAdapter } from './infrastructure/adapters/argon2-password-hasher.adapter.js';
import { MemoryPasswordHasherAdapter } from './infrastructure/adapters/memory-password-hasher.adapter.js';
import { TypeOrmUserRepositoryAdapter } from './infrastructure/adapters/typeorm-user-repository.adapter.js';
import { MemoryUserRepositoryAdapter } from './infrastructure/adapters/memory-user-repository.adapter.js';
import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity.js';
import { AdminUserController } from './interfaces/admin-user.controller.js';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case.js';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case.js';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case.js';
import { GetUserUseCase } from './application/use-cases/get-user.use-case.js';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case.js';

// Capture the database availability decision at module-definition time so it
// cannot flip between decorator evaluation and factory execution (e.g. once
// @nestjs/config loads .env mid-bootstrap).
const dbConfigured = isDatabaseConfigured();

@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    ...(dbConfigured ? [TypeOrmModule.forFeature([UserOrmEntity])] : []),
  ],
  controllers: [AdminUserController],
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
        dbConfigured && repo
          ? new TypeOrmUserRepositoryAdapter(repo)
          : new MemoryUserRepositoryAdapter(),
      inject: dbConfigured ? [getRepositoryToken(UserOrmEntity)] : [],
    },
    CreateUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    GetUserUseCase,
    ListUsersUseCase,
  ],
  exports: [PASSWORD_HASHER, USER_REPOSITORY],
})
export class UserModule {}

