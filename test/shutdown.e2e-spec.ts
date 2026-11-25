import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';

describe('Shutdown (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.enableShutdownHooks();
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close().catch(() => undefined);
  });

  it('stops accepting connections after shutdown', async () => {
    const server = app.getHttpServer();

    await request(server).get('/health').expect(200);

    await app.close();

    expect(server.listening).toBe(false);
  });
});
