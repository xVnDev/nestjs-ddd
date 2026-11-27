/**
 * @file Idempotency middleware spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { IdempotencyMiddleware } from './idempotency.middleware.js';
import type { CachePort } from '../../modules/shared/ports/cache.port.js';

describe('IdempotencyMiddleware', () => {
  it('stores and short-circuits replay with cache', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: [],
    });

    const req: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 1 },
      headers: { 'idempotency-key': 'k1' },
    };
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((body: any) => body),
      json: vi.fn((body: any) => body),
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    expect(next).toHaveBeenCalled();

    // simulate handler calling res.send
    res.send({ ok: true });
    expect(cache.set).toHaveBeenCalled();
    const setCall = (cache.set as any).mock.calls[0];
    expect(setCall[0]).toContain('nestjs-ddd:idem:');
    expect(setCall[2]).toBe(300);

    // replay
    (cache.get as any).mockResolvedValue({ status: 200, body: { ok: true } });
    const res2: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((body: any) => body),
      json: vi.fn((body: any) => body),
    };
    const next2 = vi.fn();
    await mw.use(req, res2, next2);
    expect(next2).not.toHaveBeenCalled();
    expect(res2.status).toHaveBeenCalledWith(200);
    expect(res2.json).toHaveBeenCalledWith({ ok: true });
  });

  it('different body produces different fingerprint', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: [],
    });
    const req1: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 1 },
      headers: { 'idempotency-key': 'k' },
    };
    const req2: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 2 },
      headers: { 'idempotency-key': 'k' },
    };
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    await mw.use(req1, res, vi.fn());
    res.send({ ok: true });
    const key1 = (cache.set as any).mock.calls[0][0];
    // reset set mock
    (cache.set as any).mockClear();
    (cache.get as any).mockResolvedValue(null);
    const res2: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    await mw.use(req2, res2, vi.fn());
    res2.send({ ok: true });
    const key2 = (cache.set as any).mock.calls[0][0];
    expect(key1).not.toBe(key2);
  });

  it('fingerprints when body is undefined', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: [],
    });
    const req: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      headers: { 'idempotency-key': 'k1' },
    };
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    res.send({ ok: true });
    await new Promise((r) => setTimeout(r, 0));
    expect(cache.set).toHaveBeenCalled();
  });

  it('calls next when no idempotency key header is present', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: [],
    });
    const req: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 1 },
      headers: {},
    };
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
  });

  it('calls next when route is disabled', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: ['GET /admin'],
    });
    const req: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 1 },
      headers: { 'idempotency-key': 'k1' },
    };
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
  });

  it('applies when enabledRoutes is undefined', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: undefined as any,
    });
    const req: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 1 },
      headers: { 'idempotency-key': 'k1' },
    };
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('applies when enabledRoutes contains a matching pattern', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: ['POST /x'],
    });
    const req: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 1 },
      headers: { 'idempotency-key': 'k1' },
    };
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(cache.get).toHaveBeenCalled();
  });

  it('accepts capitalized Idempotency-Key header', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: [],
    });
    const req: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 1 },
      headers: { 'Idempotency-Key': 'k1' },
    };
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(cache.get).toHaveBeenCalled();
  });

  it('falls back to req.url when originalUrl is missing', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: [],
    });
    const req: any = {
      method: 'POST',
      url: '/y',
      path: '/y',
      body: { a: 1 },
      headers: { 'idempotency-key': 'k1' },
    };
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('replays cached response with originalSend handling string body', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => ({
        status: 201,
        body: { ok: true },
      })) as CachePort['get'],
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: [],
    });
    const req: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 1 },
      headers: { 'idempotency-key': 'k1' },
    };
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('caches parsed JSON when body is a JSON string', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: [],
    });
    const req: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 1 },
      headers: { 'idempotency-key': 'k1' },
    };
    const res: any = {
      statusCode: 201,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    res.send('{"ok":true}');
    await new Promise((r) => setTimeout(r, 0));
    const setCall = (cache.set as any).mock.calls[0];
    expect(setCall[1].body).toEqual({ ok: true });
    expect(setCall[1].status).toBe(201);
  });

  it('keeps raw string body when JSON parse fails', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: [],
    });
    const req: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 1 },
      headers: { 'idempotency-key': 'k1' },
    };
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    res.send('not-json');
    await new Promise((r) => setTimeout(r, 0));
    const setCall = (cache.set as any).mock.calls[0];
    expect(setCall[1].body).toBe('not-json');
  });

  it('calls originalSend when cache.set rejects', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => {
        throw new Error('boom');
      }),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: [],
    });
    const req: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 1 },
      headers: { 'idempotency-key': 'k1' },
    };
    const sendMock = vi.fn((b: any) => b);
    const jsonMock = vi.fn((b: any) => b);
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: sendMock,
      json: jsonMock,
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    const ret = res.send({ ok: true });
    expect(ret).toBe(res);
    await new Promise((r) => setTimeout(r, 0));
    expect(sendMock).toHaveBeenCalled();
  });

  it('handles non-string body without parsing', async () => {
    const cache: CachePort = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      has: vi.fn(async () => false),
    };
    const mw = new IdempotencyMiddleware(cache, {
      headerName: 'Idempotency-Key',
      keyPrefix: 'nestjs-ddd:idem:',
      ttlSeconds: 300,
      enabledRoutes: [],
    });
    const req: any = {
      method: 'POST',
      originalUrl: '/x',
      url: '/x',
      path: '/x',
      body: { a: 1 },
      headers: { 'idempotency-key': 'k1' },
    };
    const res: any = {
      statusCode: 200,
      status: vi.fn().mockReturnThis(),
      send: vi.fn((b: any) => b),
      json: vi.fn((b: any) => b),
    };
    const next = vi.fn();
    await mw.use(req, res, next);
    res.send({ ok: true });
    await new Promise((r) => setTimeout(r, 0));
    const setCall = (cache.set as any).mock.calls[0];
    expect(setCall[1].body).toEqual({ ok: true });
  });
});
