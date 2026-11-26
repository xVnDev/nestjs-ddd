import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AlertsModule } from '../src/modules/alerts/alerts.module.js';
import { AuthModule } from '../src/modules/auth/auth.module.js';
import { MailModule } from '../src/modules/mail/mail.module.js';
import { SecurityModule } from '../src/modules/security/security.module.js';
import { UserModule } from '../src/modules/user/user.module.js';
import { INestApplication } from '@nestjs/common';

describe('Context layout (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    // Assert every context module resolves in the container.
    expect(moduleRef.get(AlertsModule)).toBeDefined();
    expect(moduleRef.get(AuthModule)).toBeDefined();
    expect(moduleRef.get(MailModule)).toBeDefined();
    expect(moduleRef.get(SecurityModule)).toBeDefined();
    expect(moduleRef.get(UserModule)).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  it('boots and responds to a smoke route', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});
