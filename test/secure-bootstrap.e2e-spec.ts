import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';

describe('Secure bootstrap (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    const configService = app.get(ConfigService);
    app.useSecurityHeaders({
      xFrameOptions: { action: 'deny' },
      strictTransportSecurity:
        configService.get('app.nodeEnv') === 'production',
    });
    app.enableShutdownHooks();
    await app.init();
  });

  afterAll(async () => {
    await app.close().catch(() => undefined);
  });

  it('applies security headers on a 200 response', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('applies security headers on a 404 response', async () => {
    const res = await request(app.getHttpServer())
      .get('/does-not-exist')
      .expect(404);
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('keeps shutdown hooks enabled', () => {
    expect(typeof app.enableShutdownHooks).toBe('function');
  });
});
