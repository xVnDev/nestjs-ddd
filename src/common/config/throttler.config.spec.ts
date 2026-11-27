/**
 * @file Unit tests for the throttler config slice.
 */

import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { throttlerConfig, THROTTLER_CONFIG } from './throttler.config.js';
import type { ThrottlerConfig as ThrottlerConfigType } from './throttler.config.js';

describe('throttlerConfig', () => {
  it('returns typed values', () => {
    process.env.THROTTLE_TTL_MS = '1000';
    process.env.THROTTLE_LIMIT = '5';
    const result = throttlerConfig() as ThrottlerConfigType;
    expect(result.ttlMs).toBe(1000);
    expect(result.limit).toBe(5);
    expect(result.storage).toBe('memory');
  });

  it('falls back to defaults when env is missing', () => {
    delete process.env.THROTTLE_TTL_MS;
    delete process.env.THROTTLE_LIMIT;
    const result = throttlerConfig() as ThrottlerConfigType;
    expect(result.ttlMs).toBe(60000);
    expect(result.limit).toBe(10);
    expect(result.storage).toBe('memory');
  });

  it('is injectable via as Provider', async () => {
    process.env.THROTTLE_TTL_MS = '1000';
    process.env.THROTTLE_LIMIT = '5';
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [NestConfigModule.forRoot({ load: [throttlerConfig], isGlobal: true })],
    }).compile();
    const configService = moduleRef.get(ConfigService);
    expect(configService.get('throttler.ttlMs')).toBe(1000);
    expect(THROTTLER_CONFIG).toBeDefined();
  });
});