/* oxlint-disable typescript/unbound-method */
/**
 * @file Unit tests for OpenAPI setup.
 */

import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const builder = {
  setTitle: vi.fn().mockReturnThis(),
  setDescription: vi.fn().mockReturnThis(),
  setVersion: vi.fn().mockReturnThis(),
  addBearerAuth: vi.fn().mockReturnThis(),
  build: vi.fn().mockReturnValue({}),
};

vi.mock('@nestjs/swagger', () => ({
  DocumentBuilder: vi.fn(function () {
    return builder;
  }),
  SwaggerModule: {
    createDocument: vi.fn(() => ({
      paths: {
        '/nullpath': null,
        '/arraypath': ['x'],
        '/mixed': {
          get: { tags: [], responses: {} },
          parameters: { in: 'query', name: 'q' },
          empty: null,
        },
        '/admin': {
          get: { tags: ['admin'], responses: {} },
        },
      },
    })),
    setup: vi.fn(),
  },
}));

vi.mock('@scalar/nestjs-api-reference', () => ({
  apiReference: vi.fn(
    () => (_req: unknown, res: { type: Function; send: Function }) => res,
  ),
}));

import { SwaggerModule } from '@nestjs/swagger';
import { setupOpenApi } from './setup-openapi.js';

describe('setupOpenApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers the user document and scalar in development', () => {
    const configService = { get: vi.fn().mockReturnValue('development') };
    const app = {
      get: vi.fn().mockReturnValue(configService),
      use: vi.fn(),
    } as unknown as INestApplication;

    setupOpenApi(app);

    expect(app.get).toHaveBeenCalledWith(ConfigService);
    expect(SwaggerModule.createDocument).toHaveBeenCalled();
    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      'docs',
      app,
      expect.any(Object),
      expect.any(Object),
    );
    expect(app.use).toHaveBeenCalled();
  });

  it('registers the admin document in non-production', () => {
    const configService = { get: vi.fn().mockReturnValue('development') };
    const app = {
      get: vi.fn().mockReturnValue(configService),
      use: vi.fn(),
    } as unknown as INestApplication;

    setupOpenApi(app);

    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      'admin/docs',
      app,
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('skips admin document in production', () => {
    const configService = { get: vi.fn().mockReturnValue('production') };
    const app = {
      get: vi.fn().mockReturnValue(configService),
      use: vi.fn(),
    } as unknown as INestApplication;

    setupOpenApi(app);

    expect(SwaggerModule.setup).toHaveBeenCalledTimes(1);
    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      'docs',
      app,
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('handles documents without paths', async () => {
    const { SwaggerModule } = await import('@nestjs/swagger');
    (SwaggerModule.createDocument as ReturnType<typeof vi.fn>).mockReturnValue(
      null,
    );
    const configService = { get: vi.fn().mockReturnValue('production') };
    const app = {
      get: vi.fn().mockReturnValue(configService),
      use: vi.fn(),
    } as unknown as INestApplication;

    setupOpenApi(app);

    expect(SwaggerModule.setup).toHaveBeenCalled();
  });

  it('handles missing config service gracefully', () => {
    const app = {
      get: vi.fn().mockReturnValue(undefined),
      use: vi.fn(),
    } as unknown as INestApplication;

    setupOpenApi(app);

    expect(SwaggerModule.setup).toHaveBeenCalledWith(
      'docs',
      app,
      expect.any(Object),
      expect.any(Object),
    );
  });
});
