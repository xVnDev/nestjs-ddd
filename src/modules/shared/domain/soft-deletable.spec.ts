/**
 * @file Unit tests for the soft-deletable base.
 */

import { describe, expect, it, vi } from 'vitest';
import { SoftDeletable } from './soft-deletable.js';

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
});
