/**
 * @file E2E smoke test for Postgres boot, query and graceful shutdown.
 */

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { startPostgres } from './support/postgres-container.js';

describe('persistence (e2e)', () => {
  let app: INestApplication;
  let container: Awaited<ReturnType<typeof startPostgres>>['container'];

  beforeAll(async () => {
    const pg = await startPostgres();
    container = pg.container;
    process.env.DATABASE_URL = pg.url;
    process.env.NODE_ENV = 'test';

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

  it('runs SELECT 1 against Postgres', async () => {
    const dataSource = app.get(DataSource);
    const result = await dataSource.query('SELECT 1 AS value');
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(Number(result[0].value)).toBe(1);
  });

  it('drains the pool on close', async () => {
    const dataSource = app.get(DataSource);
    const destroySpy = vi.spyOn(dataSource, 'destroy');
    await app.close();
    app = undefined as unknown as INestApplication;
    expect(destroySpy).toHaveBeenCalled();
  });
});
