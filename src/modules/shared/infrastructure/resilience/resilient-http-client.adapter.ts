/**
 * @file Resilient HTTP client adapter wrapping HttpClientPort with a circuit breaker.
 */

import type {
  HttpClientPort,
  HttpRequestOptions,
} from '../../ports/http-client.port.js';
import type { CircuitBreakerPort } from '../../ports/circuit-breaker.port.js';
import { HttpError } from '../../domain/http-error.js';

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export class ResilientHttpClientAdapter implements HttpClientPort {
  private readonly httpClient: HttpClientPort;
  private readonly breaker: CircuitBreakerPort;

  constructor(
    httpClientOrOptions?:
      | HttpClientPort
      | {
          httpClient?: HttpClientPort;
          client?: HttpClientPort;
          breaker?: CircuitBreakerPort;
          circuitBreaker?: CircuitBreakerPort;
        },
    breaker?: CircuitBreakerPort,
  ) {
    if (
      httpClientOrOptions &&
      typeof (httpClientOrOptions as HttpClientPort).request === 'function'
    ) {
      this.httpClient = httpClientOrOptions as HttpClientPort;
      this.breaker = breaker as CircuitBreakerPort;
    } else {
      const opts = (httpClientOrOptions ?? {}) as {
        httpClient?: HttpClientPort;
        client?: HttpClientPort;
        breaker?: CircuitBreakerPort;
        circuitBreaker?: CircuitBreakerPort;
      };
      this.httpClient = (opts.httpClient ?? opts.client) as HttpClientPort;
      this.breaker = (opts.breaker ??
        opts.circuitBreaker ??
        breaker) as CircuitBreakerPort;
    }
  }

  /** {@inheritDoc HttpClientPort.request} */
  async request<T>(options: HttpRequestOptions): Promise<T> {
    const key = originOf(options.url);
    try {
      return await this.breaker.execute(key, () =>
        this.httpClient.request<T>(options),
      );
    } catch (error) {
      if (error instanceof HttpError) throw error;
      // if breaker open, it threw Error; map to HttpError
      if (error instanceof Error && /open/i.test(error.message)) {
        throw new HttpError(503, 'Circuit breaker is OPEN');
      }
      throw error;
    }
  }

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
