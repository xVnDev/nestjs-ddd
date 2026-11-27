/**
 * @file Unit tests for the cache config slice.
 */

import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { cacheConfig, CACHE_CONFIG } from './cache.config.js';
import type { CacheConfig as CacheConfigType } from './cache.config.js';

describe('cacheConfig', () => {
  it('returns typed values', () => {
    process.env.CACHE_REDIS_URL = 'redis://localhost:6379';
    process.env.CACHE_TTL_SECONDS = '120';
    const result = cacheConfig() as CacheConfigType;
    expect(result.namespace).toBe('nestjs-ddd');
    expect(result.redisUrl).toBe('redis://localhost:6379');
    expect(result.defaultTtlSeconds).toBe(120);
    expect(result.adapter).toBe('redis');
  });

  it('falls back to defaults when env is missing', () => {
    delete process.env.CACHE_REDIS_URL;
    delete process.env.CACHE_TTL_SECONDS;
    const result = cacheConfig() as CacheConfigType;
    expect(result.namespace).toBe('nestjs-ddd');
    expect(result.defaultTtlSeconds).toBe(300);
    expect(result.redisUrl).toBeUndefined();
    expect(result.adapter).toBe('memory');
  });

  it('is injectable via as Provider', async () => {
    process.env.CACHE_REDIS_URL = 'redis://localhost:6379';
    process.env.CACHE_TTL_SECONDS = '120';
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [
        NestConfigModule.forRoot({ load: [cacheConfig], isGlobal: true }),
      ],
    }).compile();
    const configService = moduleRef.get(ConfigService);
    expect(configService.get('cache.namespace')).toBe('nestjs-ddd');
    expect(configService.get('cache.defaultTtlSeconds')).toBe(120);
    expect(CACHE_CONFIG).toBeDefined();
  });
});
