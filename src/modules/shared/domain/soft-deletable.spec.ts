/**
 * @file Unit tests for the soft-deletable base.
 */

import { describe, expect, it, vi } from 'vitest';
import { getMetadataArgsStorage } from 'typeorm';
import { SoftDeletable } from './soft-deletable.js';
import { SoftDeleteEntity } from '../infrastructure/persistence/soft-delete.entity.js';

class TestEntity extends SoftDeletable {}

describe('SoftDeletable', () => {
  it('defaults deletedAt to null', () => {
    const fixed = new Date('2026-01-01T00:00:00.000Z');
    const clock = { now: vi.fn(() => fixed) };
    const entity = new TestEntity('id-1', clock);
    expect(entity.id).toBe('id-1');
    expect(entity.deletedAt).toBeNull();
    expect(clock.now).toHaveBeenCalled();
    expect(entity.createdAt).toBe(fixed);
    expect(entity.updatedAt).toBe(fixed);
  });

  it('TypeORM base declares a delete-date column and uuid primary column', () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns.filter(
      (c) => c.target === SoftDeleteEntity,
    );
    const primaryColumns = storage.columns.filter(
      (c) => c.target === SoftDeleteEntity && c.options?.primary === true,
    );
    // @PrimaryGeneratedColumn stores generation metadata separately; check columns names
    const hasDeletedAt = columns.some((c) => c.propertyName === 'deletedAt');
    const hasCreatedAt = columns.some((c) => c.propertyName === 'createdAt');
    expect(hasDeletedAt).toBe(true);
    expect(hasCreatedAt).toBe(true);
    // Primary generated column metadata
    const generated = storage.generations.filter(
      (g) => g.target === SoftDeleteEntity,
    );
    expect(generated.length).toBeGreaterThan(0);
    expect(generated[0].strategy).toBe('uuid');
  });
});
