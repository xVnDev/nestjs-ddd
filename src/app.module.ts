/**
 * @file Root application module wiring config, observe and health modules.
 */

import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { HealthModule } from './modules/health/health.module.js';
import { AlertsModule } from './modules/alerts/alerts.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { MailModule } from './modules/mail/mail.module.js';
import { SecurityModule } from './modules/security/security.module.js';
import { UserModule } from './modules/user/user.module.js';
import { ConfigModule } from './common/config/config.module.js';
import { PersistenceModule } from './modules/shared/infrastructure/persistence/persistence.module.js';
import { LoggerModule } from './common/logger/logger.module.js';
import { observeConfig } from './common/config/observe.config.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule,
    PersistenceModule,
    LoggerModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRootAsync(observeConfig.asProvider()),
    HealthModule,
    AlertsModule,
    AuthModule,
    MailModule,
    SecurityModule,
    UserModule,
  ],
})
/**
 * Root application module.
 */
export class AppModule {}
