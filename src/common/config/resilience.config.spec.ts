/**
 * @file Unit tests for the resilience config slice.
 */

import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { resilienceConfig, RESILIENCE_CONFIG } from './resilience.config.js';
import type { ResilienceConfig as ResilienceConfigType } from './resilience.config.js';

describe('resilienceConfig', () => {
  it('returns typed values', () => {
    process.env.BREAKER_FAILURE_THRESHOLD = '5';
    process.env.BREAKER_RESET_TIMEOUT_MS = '10000';
    process.env.BREAKER_HALF_OPEN_MAX_CALLS = '2';
    const result = resilienceConfig() as ResilienceConfigType;
    expect(result.failureThreshold).toBe(5);
    expect(result.resetTimeoutMs).toBe(10000);
    expect(result.halfOpenMaxCalls).toBe(2);
    expect(result.enabled).toBe(true);
  });

  it('falls back to defaults when env is missing', () => {
    delete process.env.BREAKER_FAILURE_THRESHOLD;
    delete process.env.BREAKER_RESET_TIMEOUT_MS;
    delete process.env.BREAKER_HALF_OPEN_MAX_CALLS;
    const result = resilienceConfig() as ResilienceConfigType;
    expect(result.failureThreshold).toBe(3);
    expect(result.resetTimeoutMs).toBe(30000);
    expect(result.halfOpenMaxCalls).toBe(1);
  });

  it('is injectable via as Provider', async () => {
    process.env.BREAKER_FAILURE_THRESHOLD = '5';
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [NestConfigModule.forRoot({ load: [resilienceConfig], isGlobal: true })],
    }).compile();
    const configService = moduleRef.get(ConfigService);
    expect(configService.get('resilience.failureThreshold')).toBe(5);
    expect(RESILIENCE_CONFIG).toBeDefined();
  });
});