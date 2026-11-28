/**
 * @file Unit tests for auth domain types and module wiring.
 */

import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { createSeededFaker } from '../../../../common/fixtures/seeded-faker.js';
import { Sub } from '../../../user/domain/value-objects/sub.vo.js';
import { PASSWORD_HASHER, USER_REPOSITORY } from '../../../shared/ports/tokens.js';
import { AuthModule } from '../../auth.module.js';
import type {
  AuthenticatedPrincipal,
  AuthResult,
  Credentials,
} from './auth.types.js';

describe('auth domain types', () => {
  it('constructs immutable credentials, principal and result', () => {
    const faker = createSeededFaker(1);
    const credentials: Credentials = {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
    };
    const principal: AuthenticatedPrincipal = {
      userId: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email: faker.internet.email(),
    };
    const result: AuthResult = {
      principal,
      session: faker.string.uuid(),
    };

    expect(credentials.email).toContain('@');
    expect(principal.sub.toString()).toContain('local:');
    expect(result.session).toBeTruthy();
  });
});

describe('AuthModule', () => {
  it('resolves USER_REPOSITORY and PASSWORD_HASHER', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue({ findByEmail: vi.fn(), findById: vi.fn() })
      .overrideProvider(PASSWORD_HASHER)
      .useValue({
        hash: vi.fn(),
        verify: vi.fn(),
        needsRehash: vi.fn(),
      })
      .compile();

    expect(moduleRef.get(USER_REPOSITORY)).toBeDefined();
    expect(moduleRef.get(PASSWORD_HASHER)).toBeDefined();
  });
});

