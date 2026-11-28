/**
 * @file Global Nest config module with Joi validation and config slices.
 */

import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envSchema, validateEnv } from './validation/env.validation.js';
import { appConfig } from './app.config.js';
import { authConfig } from './auth.config.js';
import { cacheConfig } from './cache.config.js';
import { httpConfig } from './http.config.js';
import { idempotencyConfig } from './idempotency.config.js';
import { resilienceConfig } from './resilience.config.js';
import { throttlerConfig } from './throttler.config.js';
import { i18nConfig } from './i18n.config.js';
import { mailConfig } from './mail.config.js';
import { queueConfig } from './queue.config.js';
import { observeConfig } from './observe.config.js';
import { validationPipeConfig } from './validation-pipe.config.js';
import { databaseConfig } from './database.config.js';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      validate: validateEnv,
      envFilePath: '.env',
      expandVariables: true,
      load: [
        appConfig,
        authConfig,
        cacheConfig,
        httpConfig,
        throttlerConfig,
        idempotencyConfig,
        resilienceConfig,
        i18nConfig,
        mailConfig,
        queueConfig,
        observeConfig,
        validationPipeConfig,
        databaseConfig,
      ],
      cache: true,
    }),
  ],
  exports: [NestConfigModule],
})
/**
 * Global configuration module.
 */
export class ConfigModule {}
