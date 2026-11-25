import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { setupOpenApi } from '../src/common/config/openapi/setup-openapi.js';

describe('Scalar API Reference (e2e)', () => {
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
    setupOpenApi(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /docs returns HTML containing /docs-json', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs')
      .expect(200);
    expect(res.text).toContain('/docs-json');
    expect(res.text).not.toContain('/admin/docs-json');
  });

  if (process.env.NODE_ENV !== 'production') {
    it('GET /admin/docs returns HTML in development', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/docs')
        .expect(200);
      expect(res.text).toContain('/admin/docs-json');
    });
  } else {
    it('GET /admin/docs is absent in production', async () => {
      await request(app.getHttpServer()).get('/admin/docs').expect(404);
    });
  }
});
