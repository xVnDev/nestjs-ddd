/**
 * @file Root application module wiring config, observe and health modules.
 */

import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { HealthModule } from './modules/health/health.module.js';
import { ConfigModule } from './common/config/config.module.js';
import { observeConfig } from './common/config/observe.config.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRootAsync(observeConfig.asProvider()),
    HealthModule,
  ],
})
/**
 * Root application module.
 */
export class AppModule {}
