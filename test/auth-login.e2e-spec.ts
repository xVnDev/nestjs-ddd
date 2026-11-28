import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createSeededFaker } from '../src/common/fixtures/seeded-faker.js';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { PersistenceModule } from '../src/modules/shared/infrastructure/persistence/persistence.module.js';
import { isDatabaseConfigured } from '../src/common/config/database.config.js';
import { PASSWORD_HASHER, USER_REPOSITORY } from '../src/modules/shared/ports/tokens.js';
import { User } from '../src/modules/user/domain/entities/user.entity.js';
import { Sub } from '../src/modules/user/domain/value-objects/sub.vo.js';
import { DomainExceptionFilter } from '../src/common/filters/index.js';

describe('Auth login (e2e)', () => {
  let app: INestApplication;
  const faker = createSeededFaker(31);
  const email = faker.internet.email().toLowerCase();
  const password = faker.internet.password({ length: 12 });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ...(isDatabaseConfigured() ? [PersistenceModule] : []),
        AuthModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();

    const users = moduleRef.get(USER_REPOSITORY);
    const hasher = moduleRef.get(PASSWORD_HASHER);
    const hash = await hasher.hash(password);
    const user = User.createLocal({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email,
      passwordHash: hash,
      isActive: true,
    });
    await users.save(user);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the authenticated session payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    expect(response.body).toHaveProperty('principal');
    expect(response.body).toHaveProperty('session');
    expect(response.body.principal).toHaveProperty('email', email);
  });

  it('returns identical 401 bodies for wrong password and unknown email', async () => {
    const wrong = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'definitely-wrong-password' })
      .expect(401);
    const unknown = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'no-such-user@example.com', password })
      .expect(401);

    expect(JSON.stringify(wrong.body)).toBe(JSON.stringify(unknown.body));
  });

  it('rejects malformed payloads', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email })
      .expect(400);
  });

  it.todo('returns access + refresh tokens');
});
