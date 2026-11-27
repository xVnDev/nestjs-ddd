/**
 * @file Application bootstrap entry point.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule, ObserveInstrument } from './app.module.js';
import { setupOpenApi } from './common/config/openapi/setup-openapi.js';
import { DomainExceptionFilter } from './common/filters/index.js';
import { StructuredLoggerService } from './common/logger/structured-logger.service.js';
import { IdempotencyMiddleware } from './common/middleware/idempotency.middleware.js';
import { CACHE_PORT } from './modules/shared/ports/tokens.js';
import type { IdempotencyConfig } from './common/config/idempotency.config.js';

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
  (app as any).useBodyParser('json');
  (app as any).useBodyParser('urlencoded', { extended: true });
  const cachePort = app.get(CACHE_PORT);
  const idempotencyCfg = configService.get<IdempotencyConfig>('idempotency');
  if (idempotencyCfg) {
    const idempotencyMiddleware = new IdempotencyMiddleware(
      cachePort as never,
      idempotencyCfg,
    );
    app.use(idempotencyMiddleware.use.bind(idempotencyMiddleware));
  }
  setupOpenApi(app);
  app.useGlobalFilters(new DomainExceptionFilter());
  app.useSecurityHeaders({
    xFrameOptions: { action: 'deny' },
    strictTransportSecurity: configService.get('app.nodeEnv') === 'production',
  });
  app.enableShutdownHooks();
  await app.listen(configService.get<number>('app.port') ?? 3000);
}

void bootstrap();
