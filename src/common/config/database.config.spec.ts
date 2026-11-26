/**
 * @file Unit tests for the database config slice.
 */

import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { databaseConfig, DATABASE_CONFIG } from './database.config.js';
import type { DatabaseConfig as DatabaseConfigType } from './database.config.js';

describe('databaseConfig', () => {
  it('returns typed values', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.DATABASE_SSL = 'true';
    process.env.DATABASE_POOL_SIZE = '5';
    process.env.NODE_ENV = 'development';
    const result = databaseConfig() as DatabaseConfigType;
    expect(result.url).toBe('postgres://user:pass@localhost:5432/db');
    expect(result.ssl).toBe(true);
    expect(result.poolSize).toBe(5);
    expect(result.synchronize).toBe(false);
  });

  it('falls back to defaults when optional env is missing', () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/db';
    delete process.env.DATABASE_SSL;
    delete process.env.DATABASE_POOL_SIZE;
    process.env.NODE_ENV = 'test';
    const result = databaseConfig() as DatabaseConfigType;
    expect(result.ssl).toBe(false);
    expect(result.poolSize).toBe(10);
    expect(result.synchronize).toBe(false);
  });

  it('is injectable via as Provider', async () => {
    process.env.DATABASE_URL = 'postgres://localhost:5432/db';
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [
        NestConfigModule.forRoot({ load: [databaseConfig], isGlobal: true }),
      ],
    }).compile();
    const configService = moduleRef.get(ConfigService);
    expect(configService.get('database.url')).toBe('postgres://localhost:5432/db');
    expect(configService.get('database.synchronize')).toBe(false);
  });

  it('exposes a database config token', () => {
    expect(DATABASE_CONFIG).toBeDefined();
  });
});
