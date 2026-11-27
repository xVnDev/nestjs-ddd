/**
 * @file E2E spec for global throttling.
 */

import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { startPostgres } from './support/postgres-container.js';

@Controller('throttle-test')
class ThrottleTestController {
  @Get()
  get() {
    return { ok: true };
  }
}

describe('throttler (e2e)', () => {
  let app: INestApplication;
  let container: any;

  beforeAll(async () => {
    const pg = await startPostgres();
    container = pg.container;
    process.env.DATABASE_URL = pg.url;
    process.env.NODE_ENV = 'test';
    process.env.THROTTLE_TTL_MS = '60000';
    process.env.THROTTLE_LIMIT = '2';

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ThrottleTestController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
    if (container) await container.stop();
  });

  it('returns 429 after the configured limit with Retry-After', async () => {
    await request(app.getHttpServer()).get('/throttle-test').expect(200);
    await request(app.getHttpServer()).get('/throttle-test').expect(200);
    const res = await request(app.getHttpServer()).get('/throttle-test');
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('does not throttle health route', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });
});
