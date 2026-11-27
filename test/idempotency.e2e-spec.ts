/**
 * @file E2E spec for idempotency replay.
 */

import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { startPostgres } from './support/postgres-container.js';

const handlerSpy = vi.fn((body: any) => ({ ok: true, echo: body }));

@Controller('idem-test')
class IdemTestController {
  @Post()
  @HttpCode(200)
  post(@Body() body: any) {
    return handlerSpy(body);
  }
}

describe('idempotency (e2e)', () => {
  let app: INestApplication;
  let container: any;

  beforeAll(async () => {
    const pg = await startPostgres();
    container = pg.container;
    process.env.DATABASE_URL = pg.url;
    process.env.NODE_ENV = 'test';
    process.env.IDEMPOTENCY_TTL_SECONDS = '1';

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [IdemTestController],
    }).compile();
    app = moduleRef.createNestApplication();
    (app as any).useBodyParser('json');
    (app as any).useBodyParser('urlencoded', { extended: true });
    const { CACHE_PORT } =
      await import('../src/modules/shared/ports/tokens.js');
    const cachePort = app.get(CACHE_PORT);
    const configService = app.get(
      (await import('@nestjs/config')).ConfigService,
    );
    const cfg = configService.get('idempotency');
    const { IdempotencyMiddleware } =
      await import('../src/common/middleware/idempotency.middleware.js');
    const mw = new IdempotencyMiddleware(cachePort as any, cfg);
    app.use(mw.use.bind(mw));
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
    if (container) await container.stop();
  });

  it('replays cached response and invalidates on body change and TTL', async () => {
    const server = app.getHttpServer();

    const first = await request(server)
      .post('/idem-test')
      .set('Idempotency-Key', 'key-2')
      .send({ a: 1 });
    expect(first.status).toBe(200);
    expect(handlerSpy).toHaveBeenCalledTimes(1);

    const second = await request(server)
      .post('/idem-test')
      .set('Idempotency-Key', 'key-2')
      .send({ a: 1 });
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(handlerSpy).toHaveBeenCalledTimes(1);

    // body change -> new execution
    await request(server)
      .post('/idem-test')
      .set('Idempotency-Key', 'key-2')
      .send({ a: 2 })
      .expect(200);
    expect(handlerSpy).toHaveBeenCalledTimes(2);

    // TTL expiry: wait then re-execute
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await request(server)
      .post('/idem-test')
      .set('Idempotency-Key', 'key-2')
      .send({ a: 1 })
      .expect(200);
    expect(handlerSpy).toHaveBeenCalledTimes(3);
  });
});
