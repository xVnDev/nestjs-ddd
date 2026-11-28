import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { DomainExceptionFilter } from '../src/common/filters/index.js';
import { createSeededFaker } from '../src/common/fixtures/seeded-faker.js';

describe('Admin users negative (e2e)', () => {
  let app: INestApplication;
  const faker = createSeededFaker(7);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    const configService = app.get(ConfigService);
    app.useGlobalPipes(
      new ValidationPipe(
        configService.get<ValidationPipeOptions>('validationPipe'),
      ),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects malformed payloads with 400', async () => {
    await request(app.getHttpServer())
      .post('/admin/users')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('rejects unknown properties (whitelist) with 400', async () => {
    await request(app.getHttpServer())
      .post('/admin/users')
      .send({
        email: faker.internet.email(),
        password: faker.internet.password({ length: 12 }),
        foo: 'bar',
      })
      .expect(400);
  });

  it('returns 409 on duplicate sub', async () => {
    const sub = 'dup:negative';
    await request(app.getHttpServer())
      .post('/admin/users')
      .send({
        email: faker.internet.email(),
        password: faker.internet.password({ length: 12 }),
        sub,
      })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post('/admin/users')
      .send({
        email: faker.internet.email(),
        password: faker.internet.password({ length: 12 }),
        sub,
      });
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('returns 404 for missing id on get', async () => {
    await request(app.getHttpServer())
      .get('/admin/users/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('returns 404 for missing id on patch', async () => {
    await request(app.getHttpServer())
      .patch('/admin/users/00000000-0000-0000-0000-000000000000')
      .send({ email: 'x@y.com' })
      .expect(404);
  });

  it('returns 404 for missing id on delete', async () => {
    await request(app.getHttpServer())
      .delete('/admin/users/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it.skip('returns 403 for unprivileged (TODO P05-09c)', async () => {
    // Placeholder: real RBAC guard lands in P05-09c.
  });
});