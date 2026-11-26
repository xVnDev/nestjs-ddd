/**
 * @file Base value object providing structural equality.
 */

function clone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) {
    result[key] = clone((value as Record<string, unknown>)[key]);
  }
  return result as T;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    deepFreeze(record[key]);
  }
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
  }
  return Object.freeze(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  if (
    a !== null &&
    b !== null &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(b, key) &&
        deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        ),
    );
  }
  return false;
}

export abstract class ValueObject<T extends object> {
  protected readonly props: T;

  protected constructor(props: T) {
    this.props = deepFreeze(clone(props));
  }

  protected getProps(): T {
    return { ...(this.props as Record<string, unknown>) } as T;
  }

  public equals(other: unknown): boolean {
    if (other === this) return true;
    if (!(other instanceof ValueObject)) return false;
    if (this.constructor !== other.constructor) return false;
    return deepEqual(this.props, other.props);
  }
}
