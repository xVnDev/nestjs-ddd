/**
 * @file Unit tests for the idempotency config slice.
 */

import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { idempotencyConfig, IDEMPOTENCY_CONFIG } from './idempotency.config.js';
import type { IdempotencyConfig as IdempotencyConfigType } from './idempotency.config.js';

describe('idempotencyConfig', () => {
  it('returns typed values', () => {
    process.env.IDEMPOTENCY_TTL_SECONDS = '120';
    const result = idempotencyConfig() as IdempotencyConfigType;
    expect(result.headerName).toBe('Idempotency-Key');
    expect(result.keyPrefix).toBe('nestjs-ddd:idem:');
    expect(result.ttlSeconds).toBe(120);
    expect(result.enabledRoutes).toEqual([]);
  });

  it('falls back to defaults when env is missing', () => {
    delete process.env.IDEMPOTENCY_TTL_SECONDS;
    const result = idempotencyConfig() as IdempotencyConfigType;
    expect(result.ttlSeconds).toBe(300);
  });

  it('is injectable via as Provider', async () => {
    process.env.IDEMPOTENCY_TTL_SECONDS = '120';
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [NestConfigModule.forRoot({ load: [idempotencyConfig], isGlobal: true })],
    }).compile();
    const configService = moduleRef.get(ConfigService);
    expect(configService.get('idempotency.headerName')).toBe('Idempotency-Key');
    expect(IDEMPOTENCY_CONFIG).toBeDefined();
  });
});