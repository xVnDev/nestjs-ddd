/**
 * @file Unit tests for {@link ListUsersQueryDto}.
 */

import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ListUsersQueryDto } from './list-users.query.dto.js';

describe('ListUsersQueryDto', () => {
  it('accepts defaults', () => {
    const dto = new ListUsersQueryDto();
    dto.page = 1;
    dto.limit = 20;
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects page below 1', () => {
    const dto = Object.assign(new ListUsersQueryDto(), { page: 0 });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('rejects limit above 100', () => {
    const dto = Object.assign(new ListUsersQueryDto(), { limit: 101 });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });

  it('rejects invalid email filter', () => {
    const dto = Object.assign(new ListUsersQueryDto(), { email: 'bad' });
    expect(validateSync(dto).length).toBeGreaterThan(0);
  });
});
