/**
 * @file Throttler module registering the global throttler guard.
 */

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import {
  ThrottlerGuard,
  ThrottlerModule as NestThrottlerModule,
} from '@nestjs/throttler';
import {
  throttlerConfig,
  THROTTLER_CONFIG,
} from '../../../../common/config/throttler.config.js';
import type { ThrottlerConfig as ThrottlerConfigType } from '../../../../common/config/throttler.config.js';

@Module({
  imports: [
    ConfigModule.forFeature(throttlerConfig),
    NestThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ThrottlerConfigType) => ({
        throttlers: [{ ttl: cfg.ttlMs, limit: cfg.limit }],
      }),
      inject: [THROTTLER_CONFIG],
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  exports: [NestThrottlerModule],
})
export class ThrottlerModule {}
