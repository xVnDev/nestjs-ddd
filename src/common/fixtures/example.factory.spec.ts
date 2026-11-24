import { describe, expect, it } from 'vitest';
import { createExampleFixture } from './example.factory.js';

describe('createExampleFixture', () => {
  it('is deterministic for a fixed seed', () => {
    const a = createExampleFixture();
    const b = createExampleFixture();
    expect(a).toEqual(b);
  });

  it('applies overrides', () => {
    const result = createExampleFixture({ name: 'Override Name' });
    expect(result.name).toBe('Override Name');
  });

  it('uses example.com emails', () => {
    const result = createExampleFixture();
    expect(result.email.endsWith('@example.com')).toBe(true);
  });
});
