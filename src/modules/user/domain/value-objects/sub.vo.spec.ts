/**
 * @file Unit tests for {@link Sub}.
 */

import { describe, expect, it } from 'vitest';
import { ValidationDomainError } from '../../../shared/domain/domain-error.js';
import { Faker, en } from '@faker-js/faker';

function seeded(seed: number) {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);
  return faker;
}
import { Sub } from './sub.vo.js';

describe('Sub', () => {
  it('is immutable and framework-free', () => {
    const faker = seeded(42);
    const id = faker.string.uuid();
    const sub = Sub.fromLocal(id);
    expect(Object.isFrozen(sub)).toBe(true);
    expect(() => {
      (sub as unknown as { value: string }).value = 'x';
    }).toThrow();
  });

  it('trims and normalises input', () => {
    const sub = new Sub('  abc  ');
    expect(sub.toString()).toBe('abc');
    expect(sub.value).toBe('abc');
  });

  it('equals is symmetric', () => {
    const a = new Sub('abc');
    const b = new Sub('abc');
    expect(a.equals(b)).toBe(true);
    expect(b.equals(a)).toBe(true);
    expect(a.equals(a)).toBe(true);
  });

  it('rejects empty values', () => {
    expect(() => new Sub('')).toThrow(ValidationDomainError);
    expect(() => new Sub('   ')).toThrow(ValidationDomainError);
  });

  it('rejects oversized values', () => {
    const huge = 'a'.repeat(256);
    expect(() => new Sub(huge)).toThrow(ValidationDomainError);
  });

  it('rejects malformed values', () => {
    expect(() => new Sub('has space')).toThrow(ValidationDomainError);
    expect(() => new Sub('bad!')).toThrow(ValidationDomainError);
  });

  it('fromLocal and fromFederated produce equal values for one logical identity', () => {
    const faker = seeded(7);
    const id = faker.string.uuid();
    const local = Sub.fromLocal(id);
    const federated = Sub.fromFederated('local', id);
    expect(local.equals(federated)).toBe(true);
    expect(local.toString()).toBe(federated.toString());
  });

  it('distinguishes different identities', () => {
    const a = Sub.fromFederated('google', 'subject-1');
    const b = Sub.fromFederated('google', 'subject-2');
    expect(a.equals(b)).toBe(false);
  });

  it('fromLocal factory executes', () => {
    const sub = Sub.fromLocal('user-1');
    expect(sub.toString()).toBe('local:user-1');
  });

  it('fromFederated factory executes', () => {
    const sub = Sub.fromFederated('Google', 'subj');
    expect(sub.toString()).toBe('google:subj');
  });
});
