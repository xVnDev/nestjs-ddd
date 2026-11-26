/**
 * @file Token registry spec.
 */
import { describe, expect, it } from 'vitest';
import {
  CACHE,
  CLOCK,
  ENCRYPTION_SERVICE,
  ID_GENERATOR,
  MAIL,
  PASSWORD_HASHER,
  REPOSITORY_PORT,
  QUEUE,
  TOKEN_ISSUER,
  type PortToken,
} from './tokens.js';

describe('port tokens', () => {
  it('exports exactly eight unique symbols', () => {
    const tokens = [
      PASSWORD_HASHER,
      TOKEN_ISSUER,
      ENCRYPTION_SERVICE,
      ID_GENERATOR,
      CLOCK,
      CACHE,
      QUEUE,
      MAIL,
      REPOSITORY_PORT,
    ];
    expect(tokens).toHaveLength(9);
    expect(new Set(tokens).size).toBe(9);
    for (const token of tokens) {
      expect(typeof token).toBe('symbol');
    }
  });

  it('uses Symbol.for descriptions', () => {
    expect(Symbol.keyFor(PASSWORD_HASHER)).toBe('PASSWORD_HASHER');
    expect(Symbol.keyFor(TOKEN_ISSUER)).toBe('TOKEN_ISSUER');
    expect(Symbol.keyFor(ENCRYPTION_SERVICE)).toBe('ENCRYPTION_SERVICE');
    expect(Symbol.keyFor(ID_GENERATOR)).toBe('ID_GENERATOR');
    expect(Symbol.keyFor(CLOCK)).toBe('CLOCK');
    expect(Symbol.keyFor(CACHE)).toBe('CACHE');
    expect(Symbol.keyFor(QUEUE)).toBe('QUEUE');
    expect(Symbol.keyFor(MAIL)).toBe('MAIL');
    expect(Symbol.keyFor(REPOSITORY_PORT)).toBe('REPOSITORY_PORT');
  });

  it('PortToken is invariant in its type parameter', () => {
    // @ts-expect-error - incompatible port types must not be assignable
    const _incompatible: PortToken<{ a: number }> =
      null as unknown as PortToken<{ b: string }>;
    void _incompatible;
  });
});
