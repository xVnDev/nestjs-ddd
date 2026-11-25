import { describe, expect, it } from 'vitest';
import { validateSync } from 'class-validator';

import { ExampleDto } from './example.dto.js';

describe('ExampleDto', () => {
  it('passes validation for a valid payload', () => {
    const dto = Object.assign(new ExampleDto(), {
      name: 'Ada',
      email: 'ada@example.com',
      age: 5,
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('produces constraint errors for an invalid payload', () => {
    const dto = Object.assign(new ExampleDto(), {
      name: 'Ada',
      email: 'not-an-email',
      age: -1,
    });

    const errors = validateSync(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((error) => error.property === 'email')).toBe(true);
    expect(errors.some((error) => error.property === 'age')).toBe(true);
  });
});
