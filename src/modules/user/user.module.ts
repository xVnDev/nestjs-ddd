/**
 * @file Composition root for the `user` bounded context.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PASSWORD_HASHER } from '../shared/ports/tokens.js';
import { authConfig, AUTH_CONFIG } from '../../common/config/auth.config.js';
import type { AuthConfig as AuthConfigType } from '../../common/config/auth.config.js';
import { Argon2PasswordHasherAdapter } from './infrastructure/adapters/argon2-password-hasher.adapter.js';
import { MemoryPasswordHasherAdapter } from './infrastructure/adapters/memory-password-hasher.adapter.js';

@Module({
  imports: [ConfigModule.forFeature(authConfig)],
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
  ],
  exports: [PASSWORD_HASHER],
})
export class UserModule {}
