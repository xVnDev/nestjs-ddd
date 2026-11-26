/**
 * @file Unit tests for the Init migration.
 */

import { describe, expect, it, vi } from 'vitest';
import { QueryRunner } from 'typeorm';

import { Init1795719746297 } from './1795719746297-Init.js';

describe('Init1795719746297', () => {
  it('exposes the migration name', () => {
    const migration = new Init1795719746297();
    expect(migration.name).toBe('Init1795719746297');
  });

  it('creates the soft_delete_entity table and index on up', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    const migration = new Init1795719746297();
    await migration.up(queryRunner);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(
      1,
      'CREATE TABLE "soft_delete_entity" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_7c7020197b339763cdbabf9815f" PRIMARY KEY ("id"))',
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      'CREATE INDEX "IDX_522f379f55d5428d19600022e4" ON "soft_delete_entity"  ("deletedAt") ',
    );
  });

  it('drops the index and table on down', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;

    const migration = new Init1795719746297();
    await migration.down(queryRunner);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(
      1,
      'DROP INDEX "public"."IDX_522f379f55d5428d19600022e4"',
    );
    expect(query).toHaveBeenNthCalledWith(2, 'DROP TABLE "soft_delete_entity"');
  });
});
