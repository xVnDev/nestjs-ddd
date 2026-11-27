/**
 * @file Unit tests for the queue config slice.
 */

import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { queueConfig, QUEUE_CONFIG } from './queue.config.js';
import type { QueueConfig as QueueConfigType } from './queue.config.js';

describe('queueConfig', () => {
  it('returns typed values', () => {
    process.env.QUEUE_REDIS_URL = 'redis://localhost:6379';
    process.env.QUEUE_PREFIX = 'my-prefix';
    process.env.QUEUE_DEFAULT_ATTEMPTS = '5';
    const result = queueConfig() as QueueConfigType;
    expect(result.prefix).toBe('my-prefix');
    expect(result.redisUrl).toBe('redis://localhost:6379');
    expect(result.defaultJobOptions.attempts).toBe(5);
    expect(result.defaultJobOptions.backoff.type).toBe('exponential');
    expect(result.adapter).toBe('bullmq');
  });

  it('falls back to defaults when env is missing', () => {
    delete process.env.QUEUE_REDIS_URL;
    delete process.env.QUEUE_PREFIX;
    delete process.env.QUEUE_DEFAULT_ATTEMPTS;
    const result = queueConfig() as QueueConfigType;
    expect(result.prefix).toBe('nestjs-ddd');
    expect(result.defaultJobOptions.attempts).toBe(3);
    expect(result.redisUrl).toBeUndefined();
    expect(result.adapter).toBe('memory');
  });

  it('is injectable via as Provider', async () => {
    process.env.QUEUE_REDIS_URL = 'redis://localhost:6379';
    process.env.QUEUE_PREFIX = 'my-prefix';
    process.env.QUEUE_DEFAULT_ATTEMPTS = '5';
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [NestConfigModule.forRoot({ load: [queueConfig], isGlobal: true })],
    }).compile();
    const configService = moduleRef.get(ConfigService);
    expect(configService.get('queue.prefix')).toBe('my-prefix');
    expect(configService.get('queue.defaultJobOptions.attempts')).toBe(5);
    expect(QUEUE_CONFIG).toBeDefined();
  });
});