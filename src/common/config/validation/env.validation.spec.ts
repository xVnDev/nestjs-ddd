/**
 * @file Unit tests for environment validation.
 */

import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  it('passes for valid env', () => {
    expect(() =>
      validateEnv({
        PORT: 3000,
        NODE_ENV: 'development',
        DATABASE_URL: 'postgres://localhost:5432/db',
      }),
    ).not.toThrow();
  });

  it('throws on invalid PORT', () => {
    expect(() =>
      validateEnv({
        PORT: 'abc',
        NODE_ENV: 'development',
        DATABASE_URL: 'postgres://localhost:5432/db',
      }),
    ).toThrow();
  });

  it('throws on missing NODE_ENV', () => {
    expect(() =>
      validateEnv({ PORT: 3000, DATABASE_URL: 'postgres://localhost:5432/db' }),
    ).toThrow();
  });

  it('throws on unknown NODE_ENV', () => {
    expect(() =>
      validateEnv({
        PORT: 3000,
        NODE_ENV: 'staging',
        DATABASE_URL: 'postgres://localhost:5432/db',
      }),
    ).toThrow();
  });

  it('throws on missing DATABASE_URL', () => {
    expect(() =>
      validateEnv({ PORT: 3000, NODE_ENV: 'development' }),
    ).toThrow();
  });

  it('throws on invalid DATABASE_URL', () => {
    expect(() =>
      validateEnv({
        PORT: 3000,
        NODE_ENV: 'development',
        DATABASE_URL: 'not-a-url',
      }),
    ).toThrow();
  });
});
