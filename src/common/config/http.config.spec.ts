/**
 * @file Unit tests for the HTTP client config slice.
 */

import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { httpConfig, HTTP_CONFIG } from './http.config.js';
import type { HttpConfig as HttpConfigType } from './http.config.js';

describe('httpConfig', () => {
  it('returns typed values', () => {
    process.env.HTTP_TIMEOUT_MS = '1000';
    process.env.HTTP_MAX_REDIRECTS = '3';
    process.env.HTTP_RETRY_ATTEMPTS = '2';
    const result = httpConfig() as HttpConfigType;
    expect(result.timeoutMs).toBe(1000);
    expect(result.maxRedirects).toBe(3);
    expect(result.retryAttempts).toBe(2);
    expect(result.baseHeaders).toEqual({});
    expect(result.userAgent).toBe('nestjs-ddd/1.0');
  });

  it('falls back to defaults when env is missing', () => {
    delete process.env.HTTP_TIMEOUT_MS;
    delete process.env.HTTP_MAX_REDIRECTS;
    delete process.env.HTTP_RETRY_ATTEMPTS;
    const result = httpConfig() as HttpConfigType;
    expect(result.timeoutMs).toBe(5000);
    expect(result.maxRedirects).toBe(5);
    expect(result.retryAttempts).toBe(3);
  });

  it('is injectable via as Provider', async () => {
    process.env.HTTP_TIMEOUT_MS = '1000';
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [NestConfigModule.forRoot({ load: [httpConfig], isGlobal: true })],
    }).compile();
    const configService = moduleRef.get(ConfigService);
    expect(configService.get('http.timeoutMs')).toBe(1000);
    expect(HTTP_CONFIG).toBeDefined();
  });

  it('contains no secrets in serialised config', () => {
    const result = httpConfig() as HttpConfigType;
    const serialised = JSON.stringify(result);
    expect(serialised).not.toMatch(/secret|password|token/i);
  });
});