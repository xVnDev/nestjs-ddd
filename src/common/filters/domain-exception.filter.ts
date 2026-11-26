/**
 * @file Global exception filter mapping domain and HTTP errors to problem responses.
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { DomainError } from '../../modules/shared/domain/index.js';

/**
 * Determines whether an unknown value is a domain error.
 *
 * @param value - Value to test.
 * @returns `true` when the value has the domain-error shape.
 */
function isDomainError(value: unknown): value is DomainError {
  return (
    value instanceof Error &&
    typeof (value as { code?: unknown }).code === 'string' &&
    typeof (value as { httpStatus?: unknown }).httpStatus === 'number'
  );
}

/**
 * RFC 7807 problem response body.
 */
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
}

/**
 * Maps thrown errors to RFC 7807 `application/problem+json` responses.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  /**
   * Handles an exception thrown during request processing.
   *
   * @param exception - Thrown exception.
   * @param host - Arguments host for the current request.
   */
  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<{
      setHeader: (name: string, value: string) => void;
      status: (code: number) => { json: (body: ProblemDetails) => void } | void;
      json: (body: ProblemDetails) => void;
    }>();

    let requestUrl = '';
    try {
      const request = http.getRequest<{ url?: string } | undefined>();
      requestUrl = request?.url ?? '';
    } catch {
      requestUrl = '';
    }

    const problem = this.toProblem(exception, requestUrl);

    response.setHeader('Content-Type', 'application/problem+json');
    const statusResult = response.status(problem.status);
    if (statusResult && typeof statusResult.json === 'function') {
      statusResult.json(problem);
    } else {
      response.json(problem);
    }
  }

  /**
   * Converts an exception into problem details.
   *
   * @param exception - Thrown exception.
   * @param instance - Request URL used as the problem instance.
   * @returns RFC 7807 problem details.
   */
  private toProblem(exception: unknown, instance: string): ProblemDetails {
    if (isDomainError(exception)) {
      return {
        type: 'about:blank',
        title: exception.code,
        status: exception.httpStatus,
        detail: exception.message,
        instance,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const detail =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ??
            exception.message);
      return {
        type: 'about:blank',
        title: 'HTTP Exception',
        status,
        detail: Array.isArray(detail) ? detail.join(', ') : detail,
        instance,
      };
    }

    return {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred.',
      instance,
    };
  }
}
