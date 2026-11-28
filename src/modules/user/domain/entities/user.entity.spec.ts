/**
 * @file Unit tests for {@link User}.
 */

import { describe, expect, it } from 'vitest';
import { ValidationDomainError } from '../../../shared/domain/domain-error.js';
import { Sub } from '../value-objects/sub.vo.js';
import { Faker, en } from '@faker-js/faker';

function seeded(seed: number) {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);
  return faker;
}
import { User } from './user.entity.js';

describe('User', () => {
  it('stores a Sub (not a raw string)', () => {
    const faker = seeded(1);
    const sub = Sub.fromLocal(faker.string.uuid());
    const user = new User({ id: faker.string.uuid(), sub, email: faker.internet.email() });
    expect(user.sub).toBeInstanceOf(Sub);
  });

  it('normalises email', () => {
    const faker = seeded(2);
    const user = new User({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email: '  Foo@Bar.com  ',
    });
    expect(user.email).toBe('foo@bar.com');
  });

  it('rejects missing id', () => {
    const faker = seeded(3);
    expect(
      () =>
        new User({ id: '', sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email() }),
    ).toThrow(ValidationDomainError);
  });

  it('rejects missing sub', () => {
    const faker = seeded(4);
    expect(
      () => new User({ id: faker.string.uuid(), sub: null as unknown as Sub, email: faker.internet.email() }),
    ).toThrow();
  });

  it('rejects empty email', () => {
    const faker = seeded(30);
    expect(
      () => new User({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: '   ' }),
    ).toThrow(ValidationDomainError);
  });

  it('createLocal positional missing hash throws', () => {
    const faker = seeded(31);
    expect(() =>
      User.createLocal(faker.string.uuid(), Sub.fromLocal(faker.string.uuid()), faker.internet.email()),
    ).toThrow(ValidationDomainError);
  });

  it('local user requires password hash', () => {
    const faker = seeded(5);
    expect(() =>
      User.createLocal({
        id: faker.string.uuid(),
        sub: Sub.fromLocal(faker.string.uuid()),
        email: faker.internet.email(),
      }),
    ).toThrow(ValidationDomainError);
  });

  it('federated user must not carry password hash', () => {
    const faker = seeded(6);
    const user = User.createFederated({
      id: faker.string.uuid(),
      sub: Sub.fromFederated('google', faker.string.uuid()),
      email: faker.internet.email(),
      passwordHash: 'should-be-dropped',
    });
    expect(user.passwordHash).toBeNull();
  });

  it('local factory creates user with hash', () => {
    const faker = seeded(7);
    const hash = faker.string.alphanumeric(20);
    const user = User.createLocal({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email: faker.internet.email(),
      passwordHash: hash,
    });
    expect(user.passwordHash).toBe(hash);
    expect(user.isLocal()).toBe(true);
  });

  it('emits creation event', () => {
    const faker = seeded(8);
    const user = new User({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email: faker.internet.email(),
    });
    expect(user.domainEvents.length).toBe(1);
  });

  it('changeEmail emits event', () => {
    const faker = seeded(9);
    const user = new User({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email: faker.internet.email(),
    });
    user.pullEvents();
    user.changeEmail('new@example.com');
    expect(user.email).toBe('new@example.com');
    const events = user.pullEvents();
    expect(events.length).toBe(1);
  });

  it('setPasswordHash emits event', () => {
    const faker = seeded(10);
    const user = User.createFederated({
      id: faker.string.uuid(),
      sub: Sub.fromFederated('google', faker.string.uuid()),
      email: faker.internet.email(),
    });
    user.pullEvents();
    user.setPasswordHash('hash');
    expect(user.passwordHash).toBe('hash');
    expect(user.pullEvents().length).toBe(1);
  });

  it('activate/deactivate emit events', () => {
    const faker = seeded(11);
    const user = new User({
      id: faker.string.uuid(),
      sub: Sub.fromLocal(faker.string.uuid()),
      email: faker.internet.email(),
      isActive: false,
    });
    user.pullEvents();
    user.activate();
    expect(user.isActive).toBe(true);
    expect(user.pullEvents().length).toBe(1);
    user.pullEvents();
    user.deactivate();
    expect(user.isActive).toBe(false);
    expect(user.pullEvents().length).toBe(1);
  });

  it('supports positional constructor', () => {
    const faker = seeded(12);
    const id = faker.string.uuid();
    const sub = Sub.fromLocal(faker.string.uuid());
    const email = faker.internet.email();
    const user = new User(id, sub, email, 'hash');
    expect(user.id).toBe(id);
    expect(user.passwordHash).toBe('hash');
  });

  it('changeEmail throws on empty', () => {
    const faker = seeded(13);
    const user = new User({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email() });
    expect(() => user.changeEmail('   ')).toThrow(ValidationDomainError);
  });

  it('changeEmail no-op when same', () => {
    const faker = seeded(14);
    const user = new User({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: 'a@b.com' });
    user.pullEvents();
    user.changeEmail('A@B.com'.toLowerCase());
    // email normalised same, no event
    expect(user.pullEvents().length).toBe(0);
  });

  it('setEmail alias works', () => {
    const faker = seeded(15);
    const user = new User({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email() });
    user.setEmail('x@y.com');
    expect(user.email).toBe('x@y.com');
  });

  it('activate no-op when already active', () => {
    const faker = seeded(16);
    const user = new User({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email(), isActive: true });
    user.pullEvents();
    user.activate();
    expect(user.pullEvents().length).toBe(0);
  });

  it('deactivate no-op when already inactive', () => {
    const faker = seeded(17);
    const user = new User({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email(), isActive: false });
    user.pullEvents();
    user.deactivate();
    expect(user.pullEvents().length).toBe(0);
  });

  it('isFederated true when no hash', () => {
    const faker = seeded(18);
    const user = User.createFederated({ id: faker.string.uuid(), sub: Sub.fromFederated('google', faker.string.uuid()), email: faker.internet.email() });
    expect(user.isFederated()).toBe(true);
    expect(user.isLocal()).toBe(false);
  });

  it('clearEvents works', () => {
    const faker = seeded(19);
    const user = new User({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email() });
    user.clearEvents();
    expect(user.events.length).toBe(0);
  });

  it('pullEvents alias', () => {
    const faker = seeded(20);
    const user = new User({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email() });
    expect(user.pullDomainEvents().length).toBe(1);
  });

  it('create factory', () => {
    const faker = seeded(21);
    const user = User.create({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email(), passwordHash: 'h' });
    expect(user.passwordHash).toBe('h');
  });

  it('createLocal positional', () => {
    const faker = seeded(22);
    const user = User.createLocal(faker.string.uuid(), Sub.fromLocal(faker.string.uuid()), faker.internet.email(), 'h');
    expect(user.passwordHash).toBe('h');
  });

  it('createFederated positional drops hash', () => {
    const faker = seeded(23);
    const user = User.createFederated(faker.string.uuid(), Sub.fromLocal(faker.string.uuid()), faker.internet.email(), 'h');
    expect(user.passwordHash).toBeNull();
  });

  it('aliases local/federated/fromLocal/fromFederated', () => {
    const faker = seeded(24);
    const u1 = User.local({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email(), passwordHash: 'h' });
    const u2 = User.federated({ id: faker.string.uuid(), sub: Sub.fromFederated('g', faker.string.uuid()), email: faker.internet.email() });
    const u3 = User.fromLocal({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email(), passwordHash: 'h' });
    const u4 = User.fromFederated({ id: faker.string.uuid(), sub: Sub.fromFederated('g', faker.string.uuid()), email: faker.internet.email() });
    expect(u1.passwordHash).toBe('h');
    expect(u2.passwordHash).toBeNull();
    expect(u3.passwordHash).toBe('h');
    expect(u4.passwordHash).toBeNull();
  });

  it('register alias', () => {
    const faker = seeded(25);
    const user = User.register({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email(), passwordHash: 'h' });
    expect(user.passwordHash).toBe('h');
  });

  it('uncommittedEvents getter', () => {
    const faker = seeded(26);
    const user = new User({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email() });
    expect(user.uncommittedEvents.length).toBe(1);
  });

  it('events getter', () => {
    const faker = seeded(27);
    const user = new User({ id: faker.string.uuid(), sub: Sub.fromLocal(faker.string.uuid()), email: faker.internet.email() });
    expect(user.events.length).toBe(1);
  });
});
