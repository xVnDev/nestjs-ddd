/**
 * @file Crypto/identity port spec.
 */
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type {
  Claims,
  EncryptionService,
  PasswordHasher,
  TokenIssuer,
} from './index.js';

describe('crypto and identity ports', () => {
  it('PasswordHasher has async hash/verify', () => {
    expectTypeOf<PasswordHasher['hash']>().returns.toEqualTypeOf<
      Promise<string>
    >();
    expectTypeOf<PasswordHasher['verify']>().returns.toEqualTypeOf<
      Promise<boolean>
    >();
    const mock = vi.fn(async () => true) as unknown as PasswordHasher['verify'];
    expect(typeof mock).toBe('function');
  });

  it('EncryptionService has async encrypt/decrypt', () => {
    expectTypeOf<EncryptionService['encrypt']>().returns.toEqualTypeOf<
      Promise<string>
    >();
    expectTypeOf<EncryptionService['decrypt']>().returns.toEqualTypeOf<
      Promise<string>
    >();
  });

  it('TokenIssuer has async issue/verify returning Claims', () => {
    expectTypeOf<TokenIssuer['issue']>().returns.toEqualTypeOf<
      Promise<string>
    >();
    expectTypeOf<TokenIssuer['verify']>().returns.toEqualTypeOf<
      Promise<Claims>
    >();
  });

  it('vi.fn mocks satisfy each interface', () => {
    const hasher: PasswordHasher = {
      hash: vi.fn(async () => 'digest'),
      verify: vi.fn(async () => true),
    };
    const enc: EncryptionService = {
      encrypt: vi.fn(async () => 'cipher'),
      decrypt: vi.fn(async () => 'plain'),
    };
    const issuer: TokenIssuer = {
      issue: vi.fn(async () => 'token'),
      verify: vi.fn(async () => ({ sub: '1' })),
    };
    expect(hasher).toBeDefined();
    expect(enc).toBeDefined();
    expect(issuer).toBeDefined();
  });
});
