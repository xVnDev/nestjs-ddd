/**
 * @file Resilient HTTP client adapter spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { ResilientHttpClientAdapter } from './resilient-http-client.adapter.js';
import { HttpError } from '../../domain/http-error.js';

describe('ResilientHttpClientAdapter', () => {
  it('delegates on closed circuit', async () => {
    const httpClient: any = {
      request: vi.fn(async () => ({ ok: true })),
      get: vi.fn(),
      post: vi.fn(),
    };
    const breaker = {
      execute: vi.fn(async (_k, op) => op()),
      state: vi.fn(() => 'CLOSED') as any,
    };
    const adapter = new ResilientHttpClientAdapter(
      httpClient as any,
      breaker as any,
    );
    const result = await adapter.get<{ ok: boolean }>('http://example.com/x');
    expect(result.ok).toBe(true);
    expect(httpClient.request).toHaveBeenCalled();
    expect(breaker.execute).toHaveBeenCalled();
  });

  it('throws HttpError when circuit open with zero delegate calls', async () => {
    const httpClient: any = { request: vi.fn(async () => ({ ok: true })) };
    const breaker = {
      execute: vi.fn(async () => {
        throw new Error('Circuit breaker is OPEN');
      }),
      state: vi.fn(() => 'OPEN') as any,
    };
    const adapter = new ResilientHttpClientAdapter({ httpClient, breaker });
    await expect(adapter.get('http://example.com/x')).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(httpClient.request).not.toHaveBeenCalled();
  });

  it('originOf falls back to url for invalid URL', async () => {
    const httpClient: any = {
      request: vi.fn(async () => ({ ok: true })),
      get: vi.fn(),
      post: vi.fn(),
    };
    const breaker = {
      execute: vi.fn(async (_k: string, op: () => Promise<unknown>) => op()),
      state: vi.fn(() => 'CLOSED') as any,
    };
    const adapter = new ResilientHttpClientAdapter(
      httpClient as any,
      breaker as any,
    );
    const result = await adapter.get<{ ok: boolean }>('not a url');
    expect(result.ok).toBe(true);
    expect(breaker.execute).toHaveBeenCalledWith(
      'not a url',
      expect.any(Function),
    );
  });

  it('rethrows HttpError from breaker unchanged', async () => {
    const httpError = new HttpError(400, 'bad');
    const httpClient: any = { request: vi.fn(async () => ({ ok: true })) };
    const breaker = {
      execute: vi.fn(async () => {
        throw httpError;
      }),
      state: vi.fn(() => 'OPEN') as any,
    };
    const adapter = new ResilientHttpClientAdapter({ httpClient, breaker });
    await expect(adapter.get('http://example.com/x')).rejects.toBe(httpError);
  });

  it('rethrows non-open errors unchanged', async () => {
    const httpClient: any = { request: vi.fn(async () => ({ ok: true })) };
    const breaker = {
      execute: vi.fn(async () => {
        throw new Error('boom');
      }),
      state: vi.fn(() => 'CLOSED') as any,
    };
    const adapter = new ResilientHttpClientAdapter({ httpClient, breaker });
    await expect(adapter.get('http://example.com/x')).rejects.toThrow('boom');
  });

  it('supports post method', async () => {
    const httpClient: any = {
      request: vi.fn(async () => ({ ok: true })),
      get: vi.fn(),
      post: vi.fn(),
    };
    const breaker = {
      execute: vi.fn(async (_k: string, op: () => Promise<unknown>) => op()),
      state: vi.fn(() => 'CLOSED') as any,
    };
    const adapter = new ResilientHttpClientAdapter(
      httpClient as any,
      breaker as any,
    );
    const result = await adapter.post<{ ok: boolean }>('http://example.com/x', {
      a: 1,
    });
    expect(result.ok).toBe(true);
    expect(httpClient.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'http://example.com/x',
        body: { a: 1 },
      }),
    );
  });

  it('supports client/circuitBreaker option aliases', async () => {
    const httpClient: any = {
      request: vi.fn(async () => ({ ok: true })),
      get: vi.fn(),
      post: vi.fn(),
    };
    const breaker = {
      execute: vi.fn(async (_k: string, op: () => Promise<unknown>) => op()),
      state: vi.fn(() => 'CLOSED') as any,
    };
    const adapter = new ResilientHttpClientAdapter({
      client: httpClient,
      circuitBreaker: breaker,
    } as any);
    const result = await adapter.get<{ ok: boolean }>('http://example.com/x');
    expect(result.ok).toBe(true);
  });

  it('handles missing httpClient and options', () => {
    const adapter1 = new ResilientHttpClientAdapter();
    const adapter2 = new ResilientHttpClientAdapter({ breaker: {} as any });
    expect(adapter1).toBeInstanceOf(ResilientHttpClientAdapter);
    expect(adapter2).toBeInstanceOf(ResilientHttpClientAdapter);
  });
});
