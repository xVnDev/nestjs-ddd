/**
 * @file Unit tests for {@link CreateUserDto}.
 */

import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateUserDto } from './create-user.dto.js';

describe('CreateUserDto', () => {
  it('accepts valid payload', () => {
    const dto = Object.assign(new CreateUserDto(), {
      email: 'a@b.com',
      password: 'password123',
      sub: 'local:abc',
      isActive: true,
    });
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects invalid email', () => {
    const dto = Object.assign(new CreateUserDto(), {
      email: 'not-an-email',
      password: 'password123',
    });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('rejects short password', () => {
    const dto = Object.assign(new CreateUserDto(), {
      email: 'a@b.com',
      password: 'short',
    });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('rejects malformed sub', () => {
    const dto = Object.assign(new CreateUserDto(), {
      email: 'a@b.com',
      password: 'password123',
      sub: 'bad sub!',
    });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });
});
