import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { StructuredLoggerService } from './structured-logger.service.js';

/**
 * NestJS module that provides and exports {@link StructuredLoggerService}.
 */
@Module({
  imports: [ConfigModule],
  providers: [StructuredLoggerService],
  exports: [StructuredLoggerService],
})
export class LoggerModule {}
