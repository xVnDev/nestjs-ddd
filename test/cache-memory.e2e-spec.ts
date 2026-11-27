/**
 * @file E2E smoke test for the in-memory cache fallback boot with no Redis.
 */

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { startPostgres } from './support/postgres-container.js';
import { CACHE_PORT } from '../src/modules/shared/ports/tokens.js';
import type { CachePort } from '../src/modules/shared/ports/cache.port.js';

describe('cache-memory (e2e)', () => {
  let app: INestApplication;
  let container: Awaited<ReturnType<typeof startPostgres>>['container'];

  beforeAll(async () => {
    const pg = await startPostgres();
    container = pg.container;
    process.env.DATABASE_URL = pg.url;
    process.env.NODE_ENV = 'test';
    delete process.env.CACHE_REDIS_URL;

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
    if (container) await container.stop();
  });

  it('boots with the memory adapter and round-trips a cached value', async () => {
    const cache = app.get(CACHE_PORT) as CachePort;
    await cache.set('roundtrip', 'value', 60);
    expect(await cache.get('roundtrip')).toBe('value');
    expect(await cache.has('roundtrip')).toBe(true);
    await cache.delete('roundtrip');
    expect(await cache.get('roundtrip')).toBeNull();
  });
});