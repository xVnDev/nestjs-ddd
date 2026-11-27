/**
 * @file E2E smoke test for the in-memory queue fallback boot with no Redis.
 */

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { startPostgres } from './support/postgres-container.js';
import { QUEUE } from '../src/modules/shared/ports/tokens.js';
import type { QueuePort } from '../src/modules/shared/ports/queue.port.js';

describe('queue-memory (e2e)', () => {
  let app: INestApplication;
  let container: Awaited<ReturnType<typeof startPostgres>>['container'];

  beforeAll(async () => {
    const pg = await startPostgres();
    container = pg.container;
    process.env.DATABASE_URL = pg.url;
    process.env.NODE_ENV = 'test';
    delete process.env.QUEUE_REDIS_URL;

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

  it('boots with the memory adapter and delivers a job to a worker', async () => {
    const queue = app.get(QUEUE) as QueuePort;
    const handler = vi.fn(async () => undefined);
    void queue.registerWorker('jobs', handler);
    await queue.enqueue('jobs', { payload: 'value' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(handler).toHaveBeenCalledWith({ payload: 'value' });
    await queue.close();
  });
});