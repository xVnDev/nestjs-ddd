/**
 * @file Unit tests for {@link Result}.
 */

import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  ConflictDomainError,
  ValidationDomainError,
  err,
  isErr,
  isOk,
  ok,
} from './index.js';

describe('Result', () => {
  it('creates an ok result', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('creates an err result', () => {
    const error = new ValidationDomainError('boom');
    const result = err(error);
    expect(result.ok).toBe(false);
    if (isErr(result)) {
      expect(result.error).toBe(error);
    }
  });

  it('maps on ok and skips on err', () => {
    const okResult = ok(2).map((value) => value * 3);
    expect(okResult).toEqual({ ok: true, value: 6 });

    const fn = vi.fn((value: number) => value * 3);
    const errResult = err(new ValidationDomainError('boom')).map(fn);
    expect(errResult.ok).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it('maps errors on err and skips on ok', () => {
    const errResult = err(new ValidationDomainError('boom')).mapErr(
      (error) => new ConflictDomainError(error.message),
    );
    expect(errResult.ok).toBe(false);
    if (isErr(errResult)) {
      expect(errResult.error.code).toBe('CONFLICT');
    }

    const fn = vi.fn((error: ValidationDomainError) => error);
    const okResult = ok(2).mapErr(fn);
    expect(okResult.ok).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it('unwraps ok values and falls back on err', () => {
    expect(ok(7).unwrapOr(0)).toBe(7);
    expect(err(new ValidationDomainError('boom')).unwrapOr(0)).toBe(0);
  });

  it('chains multiple maps', () => {
    const result = ok(1)
      .map((value) => value + 1)
      .map((value) => value * 2);
    expect(result).toEqual({ ok: true, value: 4 });
  });

  it('narrows the union with type guards', () => {
    const result = ok(1);
    if (isOk(result)) {
      expectTypeOf(result.value).toBeNumber();
    }
    const failed = err(new ValidationDomainError('boom'));
    if (isErr(failed)) {
      expectTypeOf(failed.error).toEqualTypeOf<ValidationDomainError>();
    }
  });
});
