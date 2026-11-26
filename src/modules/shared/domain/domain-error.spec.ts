/**
 * @file Unit tests for the {@link DomainError} hierarchy.
 */

import { describe, expect, it } from 'vitest';
import {
  ConflictDomainError,
  DomainError,
  NotFoundDomainError,
  UnauthorizedDomainError,
  ValidationDomainError,
} from './domain-error.js';

describe('DomainError', () => {
  it('ValidationDomainError has code and status', () => {
    const error = new ValidationDomainError('invalid input');
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.httpStatus).toBe(400);
    expect(error.message).toBe('invalid input');
  });

  it('UnauthorizedDomainError has code and status', () => {
    const error = new UnauthorizedDomainError('not allowed');
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.httpStatus).toBe(401);
    expect(error.message).toBe('not allowed');
  });

  it('NotFoundDomainError has code and status', () => {
    const error = new NotFoundDomainError('missing');
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.httpStatus).toBe(404);
    expect(error.message).toBe('missing');
  });

  it('ConflictDomainError has code and status', () => {
    const error = new ConflictDomainError('duplicate');
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe('CONFLICT');
    expect(error.httpStatus).toBe(409);
    expect(error.message).toBe('duplicate');
  });

  it('message does not contain a stack trace', () => {
    const error = new ValidationDomainError('invalid input');
    expect(error.message).not.toMatch(/at .*:\d+/);
    expect(error.stack ?? '').toContain('domain-error');
  });
});
