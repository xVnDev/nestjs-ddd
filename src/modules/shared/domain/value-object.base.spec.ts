/**
 * @file Unit tests for {@link ValueObject}.
 */

import { describe, expect, it } from 'vitest';
import { ValueObject } from './value-object.base.js';

class RecordValueObject extends ValueObject<Record<string, number>> {
  public constructor(props: Record<string, number>) {
    super(props);
  }
}

class ComplexValueObject extends ValueObject<{
  items: number[];
  date: Date;
  pattern: RegExp;
}> {
  public constructor(props: { items: number[]; date: Date; pattern: RegExp }) {
    super(props);
  }

  public readProps() {
    return this.getProps();
  }
}

class TestValueObject extends ValueObject<{
  amount: number;
  currency: string;
  nested: { value: number };
}> {
  public constructor(props: {
    amount: number;
    currency: string;
    nested: { value: number };
  }) {
    super(props);
  }

  public readProps() {
    return this.getProps();
  }
}

describe('ValueObject', () => {
  it('compares equal for equal props', () => {
    const a = new TestValueObject({
      amount: 1,
      currency: 'USD',
      nested: { value: 2 },
    });
    const b = new TestValueObject({
      amount: 1,
      currency: 'USD',
      nested: { value: 2 },
    });
    expect(a.equals(b)).toBe(true);
  });

  it('compares unequal for different props', () => {
    const a = new TestValueObject({
      amount: 1,
      currency: 'USD',
      nested: { value: 2 },
    });
    const b = new TestValueObject({
      amount: 2,
      currency: 'USD',
      nested: { value: 2 },
    });
    expect(a.equals(b)).toBe(false);
  });

  it('compares unequal across constructors', () => {
    class Other extends ValueObject<{ amount: number }> {
      public constructor(props: { amount: number }) {
        super(props);
      }
    }
    const a = new (class extends ValueObject<{ amount: number }> {
      public constructor(props: { amount: number }) {
        super(props);
      }
    })({ amount: 1 });
    const b = new Other({ amount: 1 });
    expect(a.equals(b)).toBe(false);
  });

  it('is not affected by mutating the original props', () => {
    const props = {
      amount: 1,
      currency: 'USD',
      nested: { value: 2 },
    };
    const valueObject = new TestValueObject(props);
    props.amount = 999;
    props.nested.value = 999;
    const read = valueObject.readProps();
    expect(read.amount).toBe(1);
    expect(read.nested.value).toBe(2);
  });

  it('freezes nested objects', () => {
    const valueObject = new TestValueObject({
      amount: 1,
      currency: 'USD',
      nested: { value: 2 },
    });
    expect(Object.isFrozen(valueObject.readProps().nested)).toBe(true);
  });

  it('returns a copy from getProps', () => {
    const valueObject = new TestValueObject({
      amount: 1,
      currency: 'USD',
      nested: { value: 2 },
    });
    const copy = valueObject.readProps();
    copy.amount = 999;
    expect(valueObject.readProps().amount).toBe(1);
  });

  it('returns false for non-value-objects', () => {
    const valueObject = new TestValueObject({
      amount: 1,
      currency: 'USD',
      nested: { value: 2 },
    });
    expect(valueObject.equals(null)).toBe(false);
    expect(valueObject.equals(undefined)).toBe(false);
    expect(valueObject.equals({ amount: 1 })).toBe(false);
  });

  it('is reflexive', () => {
    const valueObject = new TestValueObject({
      amount: 1,
      currency: 'USD',
      nested: { value: 2 },
    });
    expect(valueObject.equals(valueObject)).toBe(true);
  });

  it('compares unequal for different keys', () => {
    const a = new RecordValueObject({ a: 1 });
    const b = new RecordValueObject({ b: 1 });
    expect(a.equals(b)).toBe(false);
  });

  it('compares unequal for different key counts', () => {
    const a = new RecordValueObject({ a: 1 });
    const b = new RecordValueObject({ a: 1, b: 2 });
    expect(a.equals(b)).toBe(false);
  });

  it('compares equal for complex props', () => {
    const date = new Date('2020-01-01T00:00:00.000Z');
    const a = new ComplexValueObject({
      items: [1, 2],
      date,
      pattern: /abc/g,
    });
    const b = new ComplexValueObject({
      items: [1, 2],
      date: new Date('2020-01-01T00:00:00.000Z'),
      pattern: /abc/g,
    });
    expect(a.equals(b)).toBe(true);
  });

  it('compares unequal for mismatched complex props', () => {
    const a = new ComplexValueObject({
      items: [1],
      date: new Date('2020-01-01T00:00:00.000Z'),
      pattern: /abc/g,
    });
    const b = new ComplexValueObject({
      items: [1, 2],
      date: new Date('2021-01-01T00:00:00.000Z'),
      pattern: /def/,
    });
    expect(a.equals(b)).toBe(false);
  });
});
