import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { setupOpenApi } from '../src/common/config/openapi/setup-openapi.js';

describe('OpenAPI (e2e)', () => {
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

  it('serves the user spec at /docs-json', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    expect(res.body.info.title).toBe('nestjs-ddd API');
    expect(res.body.info.version).toBeDefined();
    const schemes = Object.values(res.body.components?.securitySchemes ?? {});
    expect(schemes).toContainEqual(
      expect.objectContaining({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      }),
    );
  });

  it('serves Swagger UI HTML at /docs', async () => {
    const res = await request(app.getHttpServer()).get('/docs').expect(200);
    expect(res.text).toContain('/docs-json');
  });

  it('filters admin-tagged paths out of the user spec', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    const paths = Object.values(res.body.paths ?? {}).flat();
    const hasAdmin = JSON.stringify(res.body.paths ?? {}).includes('"admin"');
    // best-effort: no operation tagged admin
    for (const pathItem of Object.values(res.body.paths ?? {})) {
      for (const op of Object.values(pathItem as Record<string, any>)) {
        if (op && typeof op === 'object' && 'tags' in op) {
          expect((op as { tags?: string[] }).tags).not.toContain('admin');
        }
      }
    }
    void paths;
    void hasAdmin;
  });

  if (process.env.NODE_ENV !== 'production') {
    it('serves the admin spec at /admin/docs-json', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/docs-json')
        .expect(200);
      expect(res.body.info.title).toBe('nestjs-ddd API');
    });

    it('serves admin Swagger UI at /admin/docs', async () => {
      await request(app.getHttpServer()).get('/admin/docs').expect(200);
    });
  } else {
    it('returns 404 for admin docs in production', async () => {
      await request(app.getHttpServer()).get('/admin/docs-json').expect(404);
      await request(app.getHttpServer()).get('/admin/docs').expect(404);
    });
  }

  it('applies security headers to docs response', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
