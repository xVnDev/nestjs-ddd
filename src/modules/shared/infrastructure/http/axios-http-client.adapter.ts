/**
 * @file First-party HTTP client adapter implementing HttpClientPort via Axios.
 */

import { randomUUID } from 'node:crypto';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { HttpConfig } from '../../../../common/config/http.config.js';
import { HttpClientAdapterBase } from './http-client.base.js';
import type { HttpRequestOptions } from '../../ports/http-client.port.js';
import { HttpError } from '../../domain/http-error.js';

type AxiosLike =
  AxiosInstance | { request: (config: any) => Promise<AxiosResponse> };

function isAxiosInstance(value: unknown): value is AxiosLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { request?: unknown }).request === 'function'
  );
}

function toConfig(cfg: unknown): Partial<HttpConfig> {
  if (cfg && typeof cfg === 'object') return cfg as Partial<HttpConfig>;
  return {};
}

/**
 * Axios-backed HTTP client adapter.
 */
export class AxiosHttpClientAdapter extends HttpClientAdapterBase {
  private readonly axios: AxiosLike;
  private readonly config: Partial<HttpConfig>;

  constructor(
    axiosOrOptions?:
      | AxiosLike
      | {
          axios?: AxiosLike;
          axiosInstance?: AxiosLike;
          instance?: AxiosLike;
          config?: Partial<HttpConfig>;
        },
    config?: Partial<HttpConfig>,
  ) {
    super();
    if (isAxiosInstance(axiosOrOptions)) {
      this.axios = axiosOrOptions;
      this.config = toConfig(config);
    } else if (axiosOrOptions && typeof axiosOrOptions === 'object') {
      const opts = axiosOrOptions as {
        axios?: AxiosLike;
        axiosInstance?: AxiosLike;
        instance?: AxiosLike;
        config?: Partial<HttpConfig>;
      };
      this.axios = (opts.axios ??
        opts.axiosInstance ??
        opts.instance) as AxiosLike;
      this.config = toConfig(opts.config ?? config);
    } else {
      this.axios = axiosOrOptions as unknown as AxiosLike;
      this.config = toConfig(config);
    }
  }

  private get timeoutMs(): number {
    return this.config.timeoutMs ?? 5000;
  }

  private get maxRedirects(): number {
    return this.config.maxRedirects ?? 5;
  }

  private get baseHeaders(): Record<string, string> {
    return this.config.baseHeaders ?? {};
  }

  private buildHeaders(options: HttpRequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      ...this.baseHeaders,
      ...options.headers,
    };
    if (!headers['x-correlation-id'] && !headers['X-Correlation-Id']) {
      headers['x-correlation-id'] = randomUUID();
    }
    return headers;
  }

  /** {@inheritDoc HttpClientPort.request} */
  async request<T>(options: HttpRequestOptions): Promise<T> {
    const cfg = {
      method: options.method,
      url: options.url,
      data: options.body,
      headers: this.buildHeaders(options),
      timeout: options.timeoutMs ?? this.timeoutMs,
      maxRedirects: this.maxRedirects,
    };
    try {
      const response = (await this.axios.request(cfg)) as AxiosResponse<T>;
      return response.data as T;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): HttpError {
    const ae = error as
      | {
          response?: { status?: number; statusText?: string };
          code?: string;
          message?: string;
        }
      | undefined;
    if (ae?.response) {
      const status = ae.response.status ?? 0;
      const message = ae.response.statusText || 'HTTP request failed';
      return new HttpError(status, message);
    }
    if (
      axios.isAxiosError(error) ||
      ae?.code === 'ECONNABORTED' ||
      /timeout/i.test(ae?.message ?? '')
    ) {
      if (ae?.code === 'ECONNABORTED' || /timeout/i.test(ae?.message ?? '')) {
        return new HttpError(408, 'Request timed out');
      }
      if (axios.isAxiosError(error)) {
        return new HttpError(503, 'Network error');
      }
    }
    if (error instanceof Error) {
      if (/network/i.test(error.message)) {
        return new HttpError(503, 'Network error');
      }
      return new HttpError(500, 'HTTP request failed');
    }
    return new HttpError(500, 'HTTP request failed');
  }
}
