/**
 * @file Unit tests for the AddUsersTable migration.
 */

import { describe, expect, it, vi } from 'vitest';
import { QueryRunner } from 'typeorm';

import { AddUsersTable1795719746298 } from './1795719746298-AddUsersTable.js';

describe('AddUsersTable1795719746298', () => {
  it('exposes the migration name', () => {
    const migration = new AddUsersTable1795719746298();
    expect(migration.name).toBe('AddUsersTable1795719746298');
  });

  it('creates the users table and index on up', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    const migration = new AddUsersTable1795719746298();
    await migration.up(queryRunner);

    expect(query).toHaveBeenCalledTimes(2);
  });

  it('drops the index and table on down', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    const migration = new AddUsersTable1795719746298();
    await migration.down(queryRunner);

    expect(query).toHaveBeenCalledTimes(2);
  });
});
