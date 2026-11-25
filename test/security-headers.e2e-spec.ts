import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';

describe('Security headers (e2e)', () => {
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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function assertHeaders(res: request.Response) {
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    if (process.env.NODE_ENV === 'production') {
      expect(res.headers['strict-transport-security']).toBeDefined();
    } else {
      expect(res.headers['strict-transport-security']).toBeUndefined();
    }
  }

  it('sets security headers on a 200 response', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    assertHeaders(res);
  });

  it('sets security headers on a 404 response', async () => {
    const res = await request(app.getHttpServer())
      .get('/does-not-exist')
      .expect(404);
    assertHeaders(res);
  });
});
