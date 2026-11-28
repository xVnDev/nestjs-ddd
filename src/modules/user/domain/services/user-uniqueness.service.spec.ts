/**
 * @file Unit tests for {@link UserUniquenessService}.
 */

import { describe, expect, it } from 'vitest';
import { ConflictDomainError } from '../../../shared/domain/domain-error.js';
import { Sub } from '../value-objects/sub.vo.js';
import { User } from '../entities/user.entity.js';
import { Faker, en } from '@faker-js/faker';

function seeded(seed: number) {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);
  return faker;
}
import { UserUniquenessService } from './user-uniqueness.service.js';

describe('UserUniquenessService', () => {
  it('detects duplicate Sub', () => {
    const faker = seeded(21);
    const sub = Sub.fromLocal(faker.string.uuid());
    const users = [
      new User({ id: faker.string.uuid(), sub, email: faker.internet.email() }),
      new User({ id: faker.string.uuid(), sub, email: faker.internet.email() }),
    ];
    expect(UserUniquenessService.hasDuplicateSub(users)).toBe(true);
    expect(() => UserUniquenessService.assertUnique(users)).toThrow(
      ConflictDomainError,
    );
  });

  it('allows distinct Subs', () => {
    const faker = seeded(22);
    const users = [
      new User({
        id: faker.string.uuid(),
        sub: Sub.fromLocal(faker.string.uuid()),
        email: faker.internet.email(),
      }),
      new User({
        id: faker.string.uuid(),
        sub: Sub.fromLocal(faker.string.uuid()),
        email: faker.internet.email(),
      }),
    ];
    expect(UserUniquenessService.isUnique(users)).toBe(true);
  });

  it('detects duplicate email among local accounts', () => {
    const faker = seeded(23);
    const email = faker.internet.email();
    const users = [
      User.createLocal({
        id: faker.string.uuid(),
        sub: Sub.fromLocal(faker.string.uuid()),
        email,
        passwordHash: 'h1',
      }),
      User.createLocal({
        id: faker.string.uuid(),
        sub: Sub.fromLocal(faker.string.uuid()),
        email,
        passwordHash: 'h2',
      }),
    ];
    expect(UserUniquenessService.hasDuplicateEmail(users)).toBe(true);
  });

  it('ignores email duplicates for federated-only users', () => {
    const faker = seeded(24);
    const email = faker.internet.email();
    const users = [
      User.createFederated({
        id: faker.string.uuid(),
        sub: Sub.fromFederated('google', faker.string.uuid()),
        email,
      }),
      User.createFederated({
        id: faker.string.uuid(),
        sub: Sub.fromFederated('github', faker.string.uuid()),
        email,
      }),
    ];
    expect(UserUniquenessService.hasDuplicateEmail(users)).toBe(false);
  });

  it('merge case resolves federated then local to one user', () => {
    const faker = seeded(25);
    const email = faker.internet.email();
    const federated = User.createFederated({
      id: faker.string.uuid(),
      sub: Sub.fromFederated('google', faker.string.uuid()),
      email,
    });
    const local = User.createLocal({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email,
      passwordHash: 'hash',
    });
    const merged = UserUniquenessService.dedupe([federated, local]);
    expect(merged.length).toBe(1);
    expect(merged[0].isLocal()).toBe(true);
    expect(merged[0].passwordHash).toBe('hash');
  });

  it('works as instance service', () => {
    const svc = new UserUniquenessService();
    const faker = seeded(26);
    const users = [
      new User({
        id: faker.string.uuid(),
        sub: Sub.fromLocal(faker.string.uuid()),
        email: faker.internet.email(),
      }),
    ];
    expect(svc.isUnique(users)).toBe(true);
    expect(svc.hasDuplicateSub(users)).toBe(false);
    expect(svc.hasDuplicateEmail(users)).toBe(false);
    expect(() => svc.assertUnique(users)).not.toThrow();
    expect(svc.isSubUnique(users)).toBe(true);
    expect(svc.isEmailUnique(users)).toBe(true);
  });

  it('findDuplicateSub returns sub', () => {
    const faker = seeded(27);
    const sub = Sub.fromLocal(faker.string.uuid());
    const users = [
      new User({ id: faker.string.uuid(), sub, email: faker.internet.email() }),
      new User({ id: faker.string.uuid(), sub, email: faker.internet.email() }),
    ];
    expect(UserUniquenessService.findDuplicateSub(users)).not.toBeNull();
  });

  it('findDuplicateEmail returns email', () => {
    const faker = seeded(28);
    const email = faker.internet.email();
    const users = [
      User.createLocal({
        id: faker.string.uuid(),
        sub: Sub.fromLocal(faker.string.uuid()),
        email,
        passwordHash: 'h1',
      }),
      User.createLocal({
        id: faker.string.uuid(),
        sub: Sub.fromLocal(faker.string.uuid()),
        email,
        passwordHash: 'h2',
      }),
    ];
    expect(UserUniquenessService.findDuplicateEmail(users)).toBe(
      email.toLowerCase(),
    );
  });

  it('canMerge true for same email', () => {
    const faker = seeded(29);
    const email = faker.internet.email();
    const a = User.createFederated({
      id: faker.string.uuid(),
      sub: Sub.fromFederated('google', faker.string.uuid()),
      email,
    });
    const b = User.createLocal({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email,
      passwordHash: 'h',
    });
    expect(UserUniquenessService.canMerge(a, b)).toBe(true);
  });

  it('merge combines into local', () => {
    const faker = seeded(30);
    const email = faker.internet.email();
    const a = User.createFederated({
      id: faker.string.uuid(),
      sub: Sub.fromFederated('google', faker.string.uuid()),
      email,
    });
    const b = User.createLocal({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email,
      passwordHash: 'h',
    });
    const merged = UserUniquenessService.merge(a, b);
    expect(merged.isLocal()).toBe(true);
    expect(merged.passwordHash).toBe('h');
  });

  it('merge when first is local', () => {
    const faker = seeded(37);
    const email = faker.internet.email();
    const a = User.createLocal({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email,
      passwordHash: 'h',
    });
    const b = User.createFederated({
      id: faker.string.uuid(),
      sub: Sub.fromFederated('google', faker.string.uuid()),
      email,
    });
    const merged = UserUniquenessService.merge(a, b);
    expect(merged.isLocal()).toBe(true);
  });

  it('merge when both federated', () => {
    const faker = seeded(38);
    const email = faker.internet.email();
    const a = User.createFederated({
      id: faker.string.uuid(),
      sub: Sub.fromFederated('google', faker.string.uuid()),
      email,
    });
    const b = User.createFederated({
      id: faker.string.uuid(),
      sub: Sub.fromFederated('github', faker.string.uuid()),
      email,
    });
    const merged = UserUniquenessService.merge(a, b);
    expect(merged.isFederated()).toBe(true);
  });

  it('canMerge true for same sub', () => {
    const faker = seeded(39);
    const sub = Sub.fromLocal(faker.string.uuid());
    const email1 = faker.internet.email();
    const email2 = faker.internet.email();
    const a = new User({ id: faker.string.uuid(), sub, email: email1 });
    const b = new User({ id: faker.string.uuid(), sub, email: email2 });
    expect(UserUniquenessService.canMerge(a, b)).toBe(true);
  });

  it('instance merge/dedupe', () => {
    const svc = new UserUniquenessService();
    const faker = seeded(31);
    const email = faker.internet.email();
    const a = User.createFederated({
      id: faker.string.uuid(),
      sub: Sub.fromFederated('google', faker.string.uuid()),
      email,
    });
    const b = User.createLocal({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email,
      passwordHash: 'h',
    });
    expect(svc.canMerge(a, b)).toBe(true);
    const m = svc.merge(a, b);
    expect(m.isLocal()).toBe(true);
    const deduped = svc.dedupe([a, b]);
    expect(deduped.length).toBe(1);
  });

  it('assertUniqueSub throws', () => {
    const faker = seeded(32);
    const sub = Sub.fromLocal(faker.string.uuid());
    const users = [
      new User({ id: faker.string.uuid(), sub, email: faker.internet.email() }),
      new User({ id: faker.string.uuid(), sub, email: faker.internet.email() }),
    ];
    expect(() => UserUniquenessService.assertUniqueSub(users)).toThrow(
      ConflictDomainError,
    );
  });

  it('assertUniqueEmail throws', () => {
    const faker = seeded(33);
    const email = faker.internet.email();
    const users = [
      User.createLocal({
        id: faker.string.uuid(),
        sub: Sub.fromLocal(faker.string.uuid()),
        email,
        passwordHash: 'h1',
      }),
      User.createLocal({
        id: faker.string.uuid(),
        sub: Sub.fromLocal(faker.string.uuid()),
        email,
        passwordHash: 'h2',
      }),
    ];
    expect(() => UserUniquenessService.assertUniqueEmail(users)).toThrow(
      ConflictDomainError,
    );
  });

  it('aliases', () => {
    const faker = seeded(34);
    const users = [
      new User({
        id: faker.string.uuid(),
        sub: Sub.fromLocal(faker.string.uuid()),
        email: faker.internet.email(),
      }),
    ];
    expect(() => UserUniquenessService.checkUnique(users)).not.toThrow();
    expect(() => UserUniquenessService.validate(users)).not.toThrow();
    expect(() => UserUniquenessService.ensureUnique(users)).not.toThrow();
  });

  it('instance assertUniqueSub/Email', () => {
    const svc = new UserUniquenessService();
    const faker = seeded(35);
    const users = [
      new User({
        id: faker.string.uuid(),
        sub: Sub.fromLocal(faker.string.uuid()),
        email: faker.internet.email(),
      }),
    ];
    svc.assertUniqueSub(users);
    svc.assertUniqueEmail(users);
    svc.assertUnique(users);
    expect(svc.findDuplicateSub(users)).toBeNull();
    expect(svc.findDuplicateEmail(users)).toBeNull();
  });

  it('mergeUsers alias and resolveMerge alias', () => {
    const faker = seeded(36);
    const email = faker.internet.email();
    const a = User.createFederated({
      id: faker.string.uuid(),
      sub: Sub.fromFederated('google', faker.string.uuid()),
      email,
    });
    const b = User.createLocal({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email,
      passwordHash: 'h',
    });
    const m = UserUniquenessService.mergeUsers(a, b);
    expect(m.isLocal()).toBe(true);
    const r = UserUniquenessService.resolveMerge([a, b]);
    expect(r.length).toBe(1);
  });
});
