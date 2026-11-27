/**
 * @file HTTP client port.
 */

import { HTTP_CLIENT_PORT } from './tokens.js';
import type { HttpError } from '../domain/http-error.js';

export { HTTP_CLIENT_PORT };
export { HttpError } from '../domain/http-error.js';

/** Options for an HTTP request. */
export type HttpRequestOptions = {
  /** HTTP method. */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request URL. */
  url: string;
  /** Optional request body. */
  body?: unknown;
  /** Optional headers. */
  headers?: Record<string, string>;
  /** Optional timeout override in milliseconds. */
  timeoutMs?: number;
};

/** Narrow HTTP client port. */
export interface HttpClientPort {
  request<T>(options: HttpRequestOptions): Promise<T>;
  get<T>(
    url: string,
    options?: Omit<HttpRequestOptions, 'method' | 'url'>,
  ): Promise<T>;
  post<T>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'url' | 'body'>,
  ): Promise<T>;
}

export type { HttpError as HttpErrorType };
