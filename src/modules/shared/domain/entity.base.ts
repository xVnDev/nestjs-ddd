/**
 * @file Base entity providing identity-based equality.
 */

export abstract class Entity<TId> {
  public readonly id: TId;

  protected constructor(id: TId) {
    this.id = id;
    Object.defineProperty(this, 'id', {
      value: id,
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }

  public equals(other: unknown): boolean {
    if (other === this) return true;
    if (!(other instanceof Entity)) return false;
    return (
      this.constructor === other.constructor && Object.is(this.id, other.id)
    );
  }
}
