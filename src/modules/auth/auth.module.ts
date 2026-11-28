/**
 * @file Composition root for the `auth` bounded context.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../user/user.module.js';
import { authConfig, AUTH_CONFIG } from '../../common/config/auth.config.js';
import type { AuthConfig as AuthConfigType } from '../../common/config/auth.config.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { LoginUseCase } from './use-cases/login.use-case.js';
import { AuthController } from './interfaces/auth.controller.js';
import { KeyRegistryAdapter } from './adapters/key-registry.adapter.js';

@Module({
  imports: [ConfigModule.forFeature(authConfig), UserModule],
  controllers: [AuthController],
  providers: [
    LocalStrategy,
    LoginUseCase,
    {
      provide: KeyRegistryAdapter,
      useFactory: (cfg: AuthConfigType) => new KeyRegistryAdapter(cfg),
      inject: [AUTH_CONFIG],
    },
  ],
  exports: [LocalStrategy, LoginUseCase, KeyRegistryAdapter],
})
export class AuthModule {}
