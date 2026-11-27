/**
 * @file Shared HTTP client port conformance spec.
 */

import { expect, it, vi } from 'vitest';
import { definePortConformance } from '../../testing/conformance.js';
import type { PortAdapterEntry } from '../../testing/conformance.js';
import type { HttpClientPort } from '../../ports/http-client.port.js';
import { HttpError } from '../../domain/http-error.js';
import { AxiosHttpClientAdapter } from './axios-http-client.adapter.js';

function createMockAxios() {
  return {
    request: vi.fn(async (cfg: any) => {
      if (cfg.url.includes('timeout')) {
        const err: any = new Error('timeout of 1ms exceeded');
        err.code = 'ECONNABORTED';
        throw err;
      }
      if (cfg.url.includes('network')) {
        const err: any = new Error('Network Error');
        throw err;
      }
      if (cfg.url.includes('status')) {
        const err: any = new Error('Request failed');
        err.response = { status: 404, statusText: 'Not Found' };
        throw err;
      }
      return { data: { ok: true, method: cfg.method, url: cfg.url }, status: 200 };
    }),
  };
}

const adapters: ReadonlyArray<PortAdapterEntry<HttpClientPort>> = [
  {
    name: 'Axios',
    create: () => new AxiosHttpClientAdapter(createMockAxios() as any, {
      timeoutMs: 1000,
      maxRedirects: 0,
      retryAttempts: 0,
      baseHeaders: {},
      userAgent: 'test',
    }),
  },
];

definePortConformance<HttpClientPort>('HttpClient', adapters, (getAdapter) => {
  it('GET returns data', async () => {
    const client = getAdapter();
    const result = await client.get<{ ok: boolean }>('http://example.com/get');
    expect(result.ok).toBe(true);
  });

  it('POST returns data', async () => {
    const client = getAdapter();
    const result = await client.post<{ ok: boolean }>('http://example.com/post', { a: 1 });
    expect(result.ok).toBe(true);
  });

  it('request maps timeout to HttpError', async () => {
    const client = getAdapter();
    await expect(client.get('http://example.com/timeout')).rejects.toBeInstanceOf(HttpError);
  });

  it('request maps non-2xx to HttpError', async () => {
    const client = getAdapter();
    await expect(client.get('http://example.com/status')).rejects.toBeInstanceOf(HttpError);
  });

  it('request maps network failure to HttpError', async () => {
    const client = getAdapter();
    await expect(client.get('http://example.com/network')).rejects.toBeInstanceOf(HttpError);
  });
});