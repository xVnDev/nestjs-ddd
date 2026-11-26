/**
 * @file Unit tests for the TypeORM soft-delete base.
 */

import { describe, expect, it } from 'vitest';
import { getMetadataArgsStorage } from 'typeorm';
import { SoftDeleteEntity } from './soft-delete.entity.js';

describe('SoftDeleteEntity', () => {
  it('declares a delete-date column and uuid primary column', () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns.filter(
      (c) => c.target === SoftDeleteEntity,
    );
    const hasDeletedAt = columns.some((c) => c.propertyName === 'deletedAt');
    const hasCreatedAt = columns.some((c) => c.propertyName === 'createdAt');
    expect(hasDeletedAt).toBe(true);
    expect(hasCreatedAt).toBe(true);
    const generated = storage.generations.filter(
      (g) => g.target === SoftDeleteEntity,
    );
    expect(generated.length).toBeGreaterThan(0);
    expect(generated[0].strategy).toBe('uuid');
  });
});
