/**
 * @file Unit tests for the login DTO.
 */

import { describe, expect, it } from 'vitest';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto.js';

describe('LoginDto', () => {
  it('accepts valid credentials', async () => {
    const dto = new LoginDto();
    dto.email = 'user@example.com';
    dto.password = 'password123';
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects malformed credentials', async () => {
    const dto = new LoginDto();
    dto.email = 'not-an-email';
    dto.password = 'short';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
