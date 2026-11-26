/**
 * @file Unit tests for {@link Entity}.
 */

import { describe, expect, it } from 'vitest';
import { Entity } from './entity.base.js';

class TestEntity extends Entity<string> {
  public constructor(id: string) {
    super(id);
  }
}

class OtherEntity extends Entity<string> {
  public constructor(id: string) {
    super(id);
  }
}

describe('Entity', () => {
  it('compares equal by constructor and id', () => {
    const a = new TestEntity('id-1');
    const b = new TestEntity('id-1');
    expect(a.equals(b)).toBe(true);
  });

  it('compares unequal for different ids', () => {
    const a = new TestEntity('id-1');
    const b = new TestEntity('id-2');
    expect(a.equals(b)).toBe(false);
  });

  it('compares unequal across constructors', () => {
    const a = new TestEntity('id-1');
    const b = new OtherEntity('id-1');
    expect(a.equals(b)).toBe(false);
  });

  it('returns false for non-entities', () => {
    const entity = new TestEntity('id-1');
    expect(entity.equals(null)).toBe(false);
    expect(entity.equals(undefined)).toBe(false);
    expect(entity.equals({ id: 'id-1' })).toBe(false);
    expect(entity.equals('id-1')).toBe(false);
  });

  it('is reflexive', () => {
    const entity = new TestEntity('id-1');
    expect(entity.equals(entity)).toBe(true);
  });

  it('exposes the id', () => {
    const entity = new TestEntity('id-1');
    expect(entity.id).toBe('id-1');
  });

  it('does not allow id reassignment', () => {
    const entity = new TestEntity('id-1') as { id: string };
    expect(() => {
      entity.id = 'id-2';
    }).toThrow();
  });
});
