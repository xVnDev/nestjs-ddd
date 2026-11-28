/**
 * @file Composition root for the `auth` bounded context.
 */

import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { LoginUseCase } from './use-cases/login.use-case.js';
import { AuthController } from './interfaces/auth.controller.js';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [LocalStrategy, LoginUseCase],
  exports: [LocalStrategy, LoginUseCase],
})
export class AuthModule {}

