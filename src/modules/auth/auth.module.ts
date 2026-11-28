/**
 * @file Composition root for the `auth` bounded context.
 */

import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module.js';

@Module({
  imports: [UserModule],
})
export class AuthModule {}
