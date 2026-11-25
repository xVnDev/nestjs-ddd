import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { redact } from './redact.js';

/**
 * Structured application logger.
 *
 * Emits human-readable lines in development/test and single-line JSON in
 * production, redacting sensitive values before output.
 */
@Injectable()
export class StructuredLoggerService implements LoggerService {
  /**
   * Creates the logger with access to typed application configuration.
   *
   * @param configService - NestJS config service used to read `app.nodeEnv`.
   */
  constructor(private readonly configService: ConfigService) {}

  /**
   * Resolves the current runtime environment.
   */
  private get nodeEnv(): string {
    return this.configService.get<string>('app.nodeEnv') ?? 'development';
  }

  /**
   * Indicates whether the app is running in production.
   */
  private get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  /**
   * Logs an informational message.
   *
   * @param message - Primary message.
   * @param optionalParams - Additional context or metadata.
   */
  log(message: any, ...optionalParams: any[]): void {
    this.write('log', message, optionalParams);
  }

  /**
   * Logs an error message.
   *
   * @param message - Primary message.
   * @param optionalParams - Additional context or metadata.
   */
  error(message: any, ...optionalParams: any[]): void {
    this.write('error', message, optionalParams);
  }

  /**
   * Logs a warning message.
   *
   * @param message - Primary message.
   * @param optionalParams - Additional context or metadata.
   */
  warn(message: any, ...optionalParams: any[]): void {
    this.write('warn', message, optionalParams);
  }

  /**
   * Logs a debug message.
   *
   * @param message - Primary message.
   * @param optionalParams - Additional context or metadata.
   */
  debug(message: any, ...optionalParams: any[]): void {
    this.write('debug', message, optionalParams);
  }

  /**
   * Logs a verbose message.
   *
   * @param message - Primary message.
   * @param optionalParams - Additional context or metadata.
   */
  verbose(message: any, ...optionalParams: any[]): void {
    this.write('verbose', message, optionalParams);
  }

  /**
   * Writes a redacted log entry to the appropriate stream.
   *
   * @param level - Log level name.
   * @param message - Primary message.
   * @param optionalParams - Additional context or metadata.
   */
  private write(level: string, message: any, optionalParams: any[]): void {
    const redactedMessage = redact(message);
    const redactedParams = optionalParams.map((param) => redact(param));

    if (this.isProduction) {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        message: redactedMessage,
        ...(redactedParams.length > 0 ? { params: redactedParams } : {}),
      };
      process.stdout.write(`${JSON.stringify(entry)}\n`);
      return;
    }

    console.log(`[${level}]`, redactedMessage, ...redactedParams);
  }
}
