/**
 * @file Unit tests for {@link UpdateUserDto}.
 */

import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateUserDto } from './update-user.dto.js';

describe('UpdateUserDto', () => {
  it('accepts empty payload', () => {
    expect(validateSync(new UpdateUserDto())).toHaveLength(0);
  });

  it('rejects invalid email', () => {
    const dto = Object.assign(new UpdateUserDto(), { email: 'bad' });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('rejects short password', () => {
    const dto = Object.assign(new UpdateUserDto(), { password: 'short' });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('rejects malformed sub', () => {
    const dto = Object.assign(new UpdateUserDto(), { sub: 'bad!' });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });
});
