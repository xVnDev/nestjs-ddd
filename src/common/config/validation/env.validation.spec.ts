import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  it('passes for valid env', () => {
    expect(() =>
      validateEnv({ PORT: 3000, NODE_ENV: 'development' }),
    ).not.toThrow();
  });

  it('throws on invalid PORT', () => {
    expect(() =>
      validateEnv({ PORT: 'abc', NODE_ENV: 'development' }),
    ).toThrow();
  });

  it('throws on missing NODE_ENV', () => {
    expect(() => validateEnv({ PORT: 3000 })).toThrow();
  });

  it('throws on unknown NODE_ENV', () => {
    expect(() => validateEnv({ PORT: 3000, NODE_ENV: 'staging' })).toThrow();
  });
});
