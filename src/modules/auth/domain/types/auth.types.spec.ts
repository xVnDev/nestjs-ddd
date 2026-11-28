/**
 * @file Unit tests for auth domain types.
 */

import { describe, expect, it } from 'vitest';
import { Faker, en } from '@faker-js/faker';
import type { Sub } from '../../../user/domain/value-objects/sub.vo.js';
import type {
  AuthenticatedPrincipal,
  AuthResult,
  Credentials,
} from './auth.types.js';

function seeded(seed: number) {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);
  return faker;
}

describe('auth domain types', () => {
  it('constructs immutable credentials, principal and result', () => {
    const faker = seeded(1);
    const credentials: Credentials = {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
    };
    const principal: AuthenticatedPrincipal = {
      userId: faker.string.uuid(),
      sub: null as unknown as Sub,
      email: faker.internet.email(),
    };
    const result: AuthResult = {
      principal,
      session: faker.string.uuid(),
    };

    expect(credentials.email).toContain('@');
    expect(principal.userId).toBeTruthy();
    expect(result.session).toBeTruthy();
  });
});
