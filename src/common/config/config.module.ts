/**
 * @file Global Nest config module with Joi validation and config slices.
 */

import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envSchema, validateEnv } from './validation/env.validation.js';
import { appConfig } from './app.config.js';
import { observeConfig } from './observe.config.js';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      validate: validateEnv,
      envFilePath: '.env',
      expandVariables: true,
      load: [appConfig, observeConfig],
      cache: true,
    }),
  ],
  exports: [NestConfigModule],
})
/**
 * Global configuration module.
 */
export class ConfigModule {}
