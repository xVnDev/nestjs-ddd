/**
 * @file Unit tests for {@link DomainExceptionFilter}.
 */

import { BadRequestException, HttpException } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import {
  ConflictDomainError,
  NotFoundDomainError,
  UnauthorizedDomainError,
  ValidationDomainError,
} from '../../modules/shared/domain/index.js';
import { DomainExceptionFilter } from './index.js';

function createHost() {
  const response = {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/test' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('DomainExceptionFilter', () => {
  it('maps ValidationDomainError', () => {
    const { host, response } = createHost();
    new DomainExceptionFilter().catch(
      new ValidationDomainError('invalid input'),
      host,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/problem+json',
    );
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      type: 'about:blank',
      title: 'VALIDATION_ERROR',
      status: 400,
      detail: 'invalid input',
      instance: '/test',
    });
  });

  it('maps UnauthorizedDomainError', () => {
    const { host, response } = createHost();
    new DomainExceptionFilter().catch(
      new UnauthorizedDomainError('not allowed'),
      host,
    );
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401, title: 'UNAUTHORIZED' }),
    );
  });

  it('maps NotFoundDomainError', () => {
    const { host, response } = createHost();
    new DomainExceptionFilter().catch(new NotFoundDomainError('missing'), host);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 404, title: 'NOT_FOUND' }),
    );
  });

  it('maps ConflictDomainError', () => {
    const { host, response } = createHost();
    new DomainExceptionFilter().catch(
      new ConflictDomainError('duplicate'),
      host,
    );
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 409, title: 'CONFLICT' }),
    );
  });

  it('maps HttpException', () => {
    const { host, response } = createHost();
    new DomainExceptionFilter().catch(
      new BadRequestException('bad payload'),
      host,
    );
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        title: 'HTTP Exception',
        detail: 'bad payload',
      }),
    );
  });

  it('maps unknown errors to 500 without leakage', () => {
    const { host, response } = createHost();
    new DomainExceptionFilter().catch(
      new Error('secret /app/src/secret.ts\nstack trace'),
      host,
    );
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred.',
      instance: '/test',
    });
    const payload = JSON.stringify(response.json.mock.calls[0][0]);
    expect(payload).not.toContain('secret');
    expect(payload).not.toContain('stack');
  });

  it('falls back to response.json when status has no json method', () => {
    const response = {
      setHeader: vi.fn(),
      status: vi.fn(),
      json: vi.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url: '/test' }),
      }),
    } as unknown as ArgumentsHost;
    new DomainExceptionFilter().catch(
      new ValidationDomainError('invalid input'),
      host,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 400 }),
    );
  });

  it('handles a host without a request', () => {
    const response = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
    new DomainExceptionFilter().catch(
      new ValidationDomainError('invalid input'),
      host,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ instance: '' }),
    );
  });

  it('handles HttpException with object response', () => {
    const { host, response } = createHost();
    new DomainExceptionFilter().catch(
      new HttpException({ message: ['a', 'b'] }, 400),
      host,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'a, b' }),
    );
  });
});
