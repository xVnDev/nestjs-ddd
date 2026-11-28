import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { DomainExceptionFilter } from '../src/common/filters/index.js';
import { createSeededFaker } from '../src/common/fixtures/seeded-faker.js';

describe('Admin users (e2e)', () => {
  let app: INestApplication;
  const faker = createSeededFaker(42);

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

  it('creates, reads, lists, updates, soft-deletes and 404s', async () => {
    const email = faker.internet.email();
    const password = faker.internet.password({ length: 12 });

    const created = await request(app.getHttpServer())
      .post('/admin/users')
      .send({ email, password })
      .expect(201);
    expect(created.body).not.toHaveProperty('passwordHash');
    expect(created.body).not.toHaveProperty('password');
    const id = created.body.id as string;
    expect(typeof id).toBe('string');

    const fetched = await request(app.getHttpServer())
      .get(`/admin/users/${id}`)
      .expect(200);
    expect(fetched.body.id).toBe(id);
    expect(fetched.body.email).toBe(email.toLowerCase());
    expect(fetched.body).not.toHaveProperty('passwordHash');

    const listed = await request(app.getHttpServer())
      .get('/admin/users')
      .query({ page: 1, limit: 5 })
      .expect(200);
    expect(Array.isArray(listed.body.items)).toBe(true);
    expect(typeof listed.body.total).toBe('number');
    expect(listed.body.items.length).toBeGreaterThanOrEqual(1);

    const updated = await request(app.getHttpServer())
      .patch(`/admin/users/${id}`)
      .send({ email: 'updated@example.com' })
      .expect(200);
    expect(updated.body.email).toBe('updated@example.com');
    expect(updated.body).not.toHaveProperty('passwordHash');

    await request(app.getHttpServer()).delete(`/admin/users/${id}`).expect(204);

    await request(app.getHttpServer()).get(`/admin/users/${id}`).expect(404);
  });
});
