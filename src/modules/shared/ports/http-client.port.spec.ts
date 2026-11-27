/**
 * @file HTTP client port spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HTTP_CLIENT_PORT } from './tokens.js';
import type { HttpClientPort, HttpRequestOptions } from './http-client.port.js';
import { HttpError } from '../domain/http-error.js';

describe('http client port', () => {
  it('exports a unique token', () => {
    expect(typeof HTTP_CLIENT_PORT).toBe('symbol');
    expect(Symbol.keyFor(HTTP_CLIENT_PORT)).toBe('HTTP_CLIENT_PORT');
  });

  it('HttpClientPort is implementable with vi.fn', () => {
    const client: HttpClientPort = {
      request: vi.fn(async () => ({})) as any,
      get: vi.fn(async () => ({})) as any,
      post: vi.fn(async () => ({})) as any,
    };
    expect(client).toBeDefined();
  });

  it('has no axios imports', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'modules', 'shared', 'ports', 'http-client.port.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/axios/i);
  });

  it('HttpError carries status and message', () => {
    const err = new HttpError(404, 'not found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('not found');
  });

  it('HttpRequestOptions type checks', () => {
    const opts: HttpRequestOptions = { method: 'GET', url: 'http://x' };
    expect(opts.method).toBe('GET');
  });
});