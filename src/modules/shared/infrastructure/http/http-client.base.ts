/**
 * @file Shared base implementation for HttpClientPort adapters.
 *
 * Provides the `get` and `post` convenience methods once, delegating to the
 * adapter-specific `request` implementation. Adapters only implement `request`.
 */

import type {
  HttpClientPort,
  HttpRequestOptions,
} from '../../ports/http-client.port.js';

export abstract class HttpClientAdapterBase implements HttpClientPort {
  /** Adapter-specific request execution. */
  abstract request<T>(options: HttpRequestOptions): Promise<T>;

  /** {@inheritDoc HttpClientPort.get} */
  async get<T>(
    url: string,
    options?: Omit<HttpRequestOptions, 'method' | 'url'>,
  ): Promise<T> {
    return this.request<T>({ method: 'GET', url, ...options });
  }

  /** {@inheritDoc HttpClientPort.post} */
  async post<T>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'url' | 'body'>,
  ): Promise<T> {
    return this.request<T>({ method: 'POST', url, body, ...options });
  }
}
