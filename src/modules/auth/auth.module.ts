/**
 * @file Composition root for the `auth` bounded context.
 */

import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module.js';
import { LocalStrategy } from './strategies/local.strategy.js';

@Module({
  imports: [UserModule],
  providers: [LocalStrategy],
  exports: [LocalStrategy],
})
export class AuthModule {}
