/**
 * @file Axios HTTP client adapter spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { AxiosHttpClientAdapter } from './axios-http-client.adapter.js';
import { HttpError } from '../../domain/http-error.js';

describe('AxiosHttpClientAdapter', () => {
  it('performs request with method/url/timeout/headers/correlation id', async () => {
    const mockAxios = {
      request: vi.fn(async () => ({
        data: { ok: true },
        status: 200,
        headers: {},
      })),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any, {
      timeoutMs: 1234,
      maxRedirects: 2,
      retryAttempts: 1,
      baseHeaders: { 'x-base': 'base' },
      userAgent: 'ua',
    });
    const result = await adapter.request<{ ok: boolean }>({
      method: 'GET',
      url: 'http://example.com/x',
      headers: { 'x-extra': 'extra' },
    });
    expect(result.ok).toBe(true);
    expect(mockAxios.request).toHaveBeenCalledOnce();
    const cfg = (mockAxios.request as any).mock.calls[0][0];
    expect(cfg.method).toBe('GET');
    expect(cfg.url).toBe('http://example.com/x');
    expect(cfg.timeout).toBe(1234);
    expect(cfg.maxRedirects).toBe(2);
    expect(cfg.headers['x-base']).toBe('base');
    expect(cfg.headers['x-extra']).toBe('extra');
    expect(cfg.headers['x-correlation-id']).toBeDefined();
  });

  it('get wrapper calls request', async () => {
    const mockAxios = {
      request: vi.fn(async () => ({ data: 42, status: 200 })),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any);
    expect(await adapter.get<number>('http://example.com/g')).toBe(42);
  });

  it('post wrapper sends body', async () => {
    const mockAxios = {
      request: vi.fn(async () => ({ data: 'created', status: 201 })),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any);
    expect(await adapter.post<string>('http://example.com/p', { a: 1 })).toBe(
      'created',
    );
    const cfg = (mockAxios.request as any).mock.calls[0][0];
    expect(cfg.data).toEqual({ a: 1 });
  });

  it('maps status error to HttpError', async () => {
    const mockAxios = {
      request: vi.fn(async () => {
        const err: any = new Error('fail');
        err.response = { status: 500, statusText: 'Server Error' };
        err.isAxiosError = true;
        throw err;
      }),
    };
    // make axios.isAxiosError return true
    const adapter = new AxiosHttpClientAdapter(mockAxios as any);
    // monkey: axios import; rely on err having response and code not timeout
    await expect(adapter.get('http://example.com/s')).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('maps status error with missing statusText to fallback message', async () => {
    const mockAxios = {
      request: vi.fn(async () => {
        const err: any = new Error('fail');
        err.response = { status: 404 };
        throw err;
      }),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any);
    const err = (await adapter
      .get('http://example.com/s2')
      .catch((e) => e)) as any;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(404);
    expect(err.message).toBe('HTTP request failed');
  });

  it('maps timeout by message regex to HttpError 408', async () => {
    const mockAxios = {
      request: vi.fn(async () => {
        throw new Error('request timeout exceeded');
      }),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any);
    const err = (await adapter
      .get('http://example.com/tr')
      .catch((e) => e)) as any;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(408);
  });

  it('maps timeout to HttpError 408', async () => {
    const mockAxios = {
      request: vi.fn(async () => {
        const err: any = new Error('timeout of 1ms exceeded');
        err.code = 'ECONNABORTED';
        throw err;
      }),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any);
    const err = (await adapter
      .get('http://example.com/t')
      .catch((e) => e)) as any;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(408);
  });

  it('maps network error to HttpError 503', async () => {
    const mockAxios = {
      request: vi.fn(async () => {
        throw new Error('Network Error');
      }),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any);
    const err = (await adapter
      .get('http://example.com/n')
      .catch((e) => e)) as any;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(503);
  });

  it('supports options-object constructor', async () => {
    const mockAxios = {
      request: vi.fn(async () => ({ data: 7, status: 200 })),
    };
    const adapter = new AxiosHttpClientAdapter({
      axios: mockAxios as any,
      config: { timeoutMs: 9 },
    });
    expect(await adapter.get<number>('http://example.com/o')).toBe(7);
  });

  it('handles non-object first constructor argument (else branch)', () => {
    const adapter = new AxiosHttpClientAdapter(
      undefined as any,
      { timeoutMs: 3 } as any,
    );
    expect(adapter).toBeInstanceOf(AxiosHttpClientAdapter);
  });

  it('supports axiosInstance/instance constructor variants', async () => {
    const m1 = { request: vi.fn(async () => ({ data: 1, status: 200 })) };
    const a1 = new AxiosHttpClientAdapter({ axiosInstance: m1 as any });
    expect(await a1.get<number>('http://example.com/a')).toBe(1);
    const m2 = { request: vi.fn(async () => ({ data: 2, status: 200 })) };
    const a2 = new AxiosHttpClientAdapter({ instance: m2 as any });
    expect(await a2.get<number>('http://example.com/b')).toBe(2);
  });

  it('uses default timeout and empty base headers when no config', async () => {
    const mockAxios = {
      request: vi.fn(async () => ({ data: 'ok', status: 200 })),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any);
    await adapter.request({ method: 'GET', url: 'http://example.com/d' });
    const cfg = (mockAxios.request as any).mock.calls[0][0];
    expect(cfg.timeout).toBe(5000);
    expect(cfg.maxRedirects).toBe(5);
  });

  it('preserves provided correlation id header', async () => {
    const mockAxios = {
      request: vi.fn(async () => ({ data: 'ok', status: 200 })),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any, {
      baseHeaders: {},
    });
    await adapter.request({
      method: 'GET',
      url: 'http://example.com/c',
      headers: { 'X-Correlation-Id': 'cid-1' },
    });
    const cfg = (mockAxios.request as any).mock.calls[0][0];
    expect(cfg.headers['X-Correlation-Id']).toBe('cid-1');
    expect(cfg.headers['x-correlation-id']).toBeUndefined();
  });

  it('maps axios error without response to HttpError 503', async () => {
    const mockAxios = {
      request: vi.fn(async () => {
        const err: any = new Error('boom');
        err.isAxiosError = true;
        throw err;
      }),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any);
    const err = (await adapter
      .get('http://example.com/ax')
      .catch((e) => e)) as any;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(503);
  });

  it('maps generic Error to HttpError 500', async () => {
    const mockAxios = {
      request: vi.fn(async () => {
        throw new Error('something else');
      }),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any);
    const err = (await adapter
      .get('http://example.com/ge')
      .catch((e) => e)) as any;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(500);
  });

  it('maps non-Error thrown value to HttpError 500', async () => {
    const mockAxios = {
      request: vi.fn(async () => {
        throw 'string failure';
      }),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any);
    const err = (await adapter
      .get('http://example.com/ne')
      .catch((e) => e)) as any;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(500);
  });

  it('maps network-ish Error message to HttpError 503', async () => {
    const mockAxios = {
      request: vi.fn(async () => {
        throw new Error('network down');
      }),
    };
    const adapter = new AxiosHttpClientAdapter(mockAxios as any);
    const err = (await adapter
      .get('http://example.com/net')
      .catch((e) => e)) as any;
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(503);
  });
});
