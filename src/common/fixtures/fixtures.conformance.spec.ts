/**
 * @file Cross-factory conformance checks for fixture factories.
 */

import { describe, expect, it } from 'vitest';
import * as fixtures from './index.js';

describe('fixtures conformance', () => {
  it('seeded-faker is deterministic', () => {
    const a = fixtures.createSeededFaker(42);
    const b = fixtures.createSeededFaker(42);
    expect(a.person.fullName()).toBe(b.person.fullName());
  });

  it('example factory is deterministic', () => {
    const a = fixtures.createExampleFixture();
    const b = fixtures.createExampleFixture();
    expect(a).toEqual(b);
  });

  it('example factory emails use example.com', () => {
    const result = fixtures.createExampleFixture();
    expect(result.email.endsWith('@example.com')).toBe(true);
  });

  it('contains no sensitive patterns', () => {
    const serialized = JSON.stringify(fixtures.createExampleFixture());
    expect(serialized).not.toMatch(/password/i);
    expect(serialized).not.toMatch(/token/i);
  });
});
