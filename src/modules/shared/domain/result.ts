/**
 * @file Result type for non-throwing domain operations.
 */

import type { DomainError } from './domain-error.js';

export interface OkResult<T, E = DomainError> {
  readonly ok: true;
  readonly value: T;
  map<U>(fn: (value: T) => U): Result<U, E>;
  mapErr<F>(fn: (error: E) => F): Result<T, F>;
  unwrapOr<U>(fallback: U): T | U;
}

export interface ErrResult<T, E = DomainError> {
  readonly ok: false;
  readonly error: E;
  map<U>(fn: (value: T) => U): Result<U, E>;
  mapErr<F>(fn: (error: E) => F): Result<T, F>;
  unwrapOr<U>(fallback: U): T | U;
}

export type Result<T, E = DomainError> = OkResult<T, E> | ErrResult<T, E>;

class OkResultImpl<T, E> implements OkResult<T, E> {
  public readonly ok = true as const;

  public constructor(public readonly value: T) {}

  public map<U>(fn: (value: T) => U): Result<U, E> {
    return ok(fn(this.value));
  }

  public mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  public unwrapOr<U>(_fallback: U): T | U {
    return this.value;
  }
}

class ErrResultImpl<T, E> implements ErrResult<T, E> {
  public readonly ok = false as const;

  public constructor(public readonly error: E) {}

  public map<U>(_fn: (value: T) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  public mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return err(fn(this.error));
  }

  public unwrapOr<U>(fallback: U): T | U {
    return fallback;
  }
}

export function ok<T, E = DomainError>(value: T): Result<T, E> {
  return new OkResultImpl<T, E>(value);
}

export function err<T = never, E = DomainError>(error: E): Result<T, E> {
  return new ErrResultImpl<T, E>(error);
}

export function isOk<T, E>(result: Result<T, E>): result is OkResult<T, E> {
  return result.ok === true;
}

export function isErr<T, E>(result: Result<T, E>): result is ErrResult<T, E> {
  return result.ok === false;
}
