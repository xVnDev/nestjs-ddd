/**
 * @file Unit tests for the config module.
 */

import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { ConfigModule } from './config.module.js';

describe('ConfigModule', () => {
  it('compiles with valid env', async () => {
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://localhost:5432/db';
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule],
    }).compile();
    expect(moduleRef).toBeDefined();
  });
});
