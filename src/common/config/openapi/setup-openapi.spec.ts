import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

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
    createDocument: vi.fn(() => ({ paths: {} })),
    setup: vi.fn(),
  },
}));

import { SwaggerModule } from '@nestjs/swagger';
import { setupOpenApi } from './setup-openapi.js';

describe('setupOpenApi', () => {
  it('registers the user document', () => {
    const configService = { get: vi.fn().mockReturnValue('development') };
    const app = {
      get: vi.fn().mockReturnValue(configService),
      use: vi.fn(),
    } as unknown as INestApplication;
    setupOpenApi(app);
    expect(SwaggerModule.setup).toHaveBeenCalledWith('docs', app, expect.any(Object));
  });
});
