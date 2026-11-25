/**
 * @file Unit tests for Scalar helpers.
 */

import { INestApplication } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@scalar/nestjs-api-reference', () => ({
  apiReference: vi.fn(
    () => (_req: unknown, res: { type: Function; send: Function }) => res,
  ),
}));

import {
  apiReference,
  createScalarHandler,
  mountScalarApiReference,
  shouldRegisterAdminDocs,
} from './scalar-api-reference.js';

describe('scalar-api-reference helpers', () => {
  it('evaluates environment guards', () => {
    expect(shouldRegisterAdminDocs('production')).toBe(false);
    expect(shouldRegisterAdminDocs('development')).toBe(true);
  });

  it('creates and mounts scalar handlers', () => {
    const handler = createScalarHandler('/docs-json');
    expect(typeof handler).toBe('function');

    const app = { use: vi.fn() } as unknown as INestApplication;
    mountScalarApiReference(app, '/docs', '/docs-json');
    expect(app.use).toHaveBeenCalledWith('/docs', expect.any(Function));

    expect(typeof apiReference).toBe('function');
  });
});
