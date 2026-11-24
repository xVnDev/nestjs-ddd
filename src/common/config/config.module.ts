import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envSchema, validateEnv } from './validation/env.validation.js';
import { appConfig } from './app.config.js';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      validate: validateEnv,
      envFilePath: '.env',
      expandVariables: true,
      load: [appConfig],
      cache: true,
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
