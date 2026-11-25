import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { setupOpenApi } from '../src/common/config/openapi/setup-openapi.js';

describe('OpenAPI production (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = process.env.PORT || '3000';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useSecurityHeaders({
      xFrameOptions: { action: 'deny' },
      strictTransportSecurity: true,
    });
    setupOpenApi(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps user spec available in production', async () => {
    await request(app.getHttpServer()).get('/docs-json').expect(200);
    await request(app.getHttpServer()).get('/docs').expect(200);
    await request(app.getHttpServer()).get('/docs').expect(200);
  });

  it('returns 404 for all admin routes in production', async () => {
    await request(app.getHttpServer()).get('/admin/docs-json').expect(404);
    await request(app.getHttpServer()).get('/admin/docs').expect(404);
    await request(app.getHttpServer()).get('/admin/docs').expect(404);
  });

  it('bearer scheme present in user spec', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    const schemes = Object.values(res.body.components?.securitySchemes ?? {});
    expect(schemes).toContainEqual(
      expect.objectContaining({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      }),
    );
  });
});
