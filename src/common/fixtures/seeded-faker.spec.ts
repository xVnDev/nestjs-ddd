import { describe, expect, it } from 'vitest';
import { createSeededFaker } from './seeded-faker.js';

describe('createSeededFaker', () => {
  it('is deterministic for the same seed', () => {
    const a = createSeededFaker(42);
    const b = createSeededFaker(42);
    expect(a.person.fullName()).toBe(b.person.fullName());
    expect(a.internet.email()).toBe(b.internet.email());
  });

  it('differs for a different seed', () => {
    const a = createSeededFaker(42);
    const b = createSeededFaker(7);
    expect(a.person.fullName()).not.toBe(b.person.fullName());
  });
});
