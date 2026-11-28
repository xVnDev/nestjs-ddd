/**
 * @file Unit tests for {@link Roles}.
 */

import { describe, expect, it } from 'vitest';
import { ROLES_KEY, Roles } from './roles.decorator.js';

describe('Roles decorator', () => {
  it('exports a single metadata key', () => {
    expect(ROLES_KEY).toBe('roles');
  });

  it('is a function', () => {
    expect(typeof Roles).toBe('function');
    expect(typeof Roles('admin')).toBe('function');
  });
});
