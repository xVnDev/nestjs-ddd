/**
 * @file Framework-free soft-deletable base contract.
 */

/**
 * Minimal clock contract used to assign timestamps.
 */
interface SoftDeletableClock {
  now(): Date;
}

/**
 * Framework-free base carrying soft-delete metadata.
 */
export abstract class SoftDeletable {
  public id: string;
  public createdAt: Date;
  public updatedAt: Date;
  public deletedAt: Date | null;

  public constructor(id?: string, clock?: SoftDeletableClock) {
    this.id = id ?? '';
    const now = clock?.now() ?? new Date();
    this.createdAt = now;
    this.updatedAt = now;
    this.deletedAt = null;
  }
}
