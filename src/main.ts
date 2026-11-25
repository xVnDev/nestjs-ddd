/**
 * @file Application bootstrap entry point.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule, ObserveInstrument } from './app.module.js';
import { StructuredLoggerService } from './common/logger/structured-logger.service.js';

/**
 * Bootstraps the NestJS application.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  app.useLogger(app.get(StructuredLoggerService));
  app.useGlobalPipes(
    new ValidationPipe(
      configService.get<ValidationPipeOptions>('validationPipe'),
    ),
  );
  app.useSecurityHeaders({
    xFrameOptions: { action: 'deny' },
    strictTransportSecurity:
      configService.get('app.nodeEnv') === 'production',
  });
  await app.listen(configService.get<number>('app.port') ?? 3000);
}

void bootstrap();
