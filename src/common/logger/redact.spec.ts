import { describe, expect, it } from 'vitest';
import { redact } from './redact.js';

describe('redact', () => {
  it('redacts sensitive keys including nested ones', () => {
    const input = {
      name: 'Ada',
      password: 'secret-password',
      nested: {
        accessToken: 'token-123',
        email: 'ada@example.com',
        count: 5,
      },
    };
    const result = redact(input) as Record<string, any>;
    expect(result.password).toBe('[REDACTED]');
    expect(result.nested.accessToken).toBe('[REDACTED]');
    expect(result.nested.email).toBe('[REDACTED]');
    expect(result.name).toBe('Ada');
    expect(result.nested.count).toBe(5);
  });

  it('redacts items in arrays', () => {
    const input = [{ token: 't1' }, { token: 't2' }];
    const result = redact(input) as Array<Record<string, string>>;
    expect(result[0].token).toBe('[REDACTED]');
    expect(result[1].token).toBe('[REDACTED]');
  });

  it('does not mutate the input', () => {
    const input = Object.freeze({ password: 'secret', nested: { token: 't' } });
    redact(input);
    expect((input as any).password).toBe('secret');
    expect((input as any).nested.token).toBe('t');
  });
});
