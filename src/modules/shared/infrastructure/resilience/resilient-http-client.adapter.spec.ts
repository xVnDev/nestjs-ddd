/**
 * @file Resilient HTTP client adapter spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { ResilientHttpClientAdapter } from './resilient-http-client.adapter.js';
import { HttpError } from '../../domain/http-error.js';

describe('ResilientHttpClientAdapter', () => {
  it('delegates on closed circuit', async () => {
    const httpClient: any = { request: vi.fn(async () => ({ ok: true })), get: vi.fn(), post: vi.fn() };
    const breaker = { execute: vi.fn(async (_k, op) => op()), state: vi.fn(() => 'CLOSED') as any };
    const adapter = new ResilientHttpClientAdapter(httpClient as any, breaker as any);
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
    await expect(adapter.get('http://example.com/x')).rejects.toBeInstanceOf(HttpError);
    expect(httpClient.request).not.toHaveBeenCalled();
  });
});