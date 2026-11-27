/**
 * @file In-memory repository fallback adapter.
 */

import type { Clock } from '../../ports/clock.port.js';
import type { IdGenerator } from '../../ports/id-generator.port.js';
import type { RepositoryPort } from '../../ports/repository.port.js';

import { cloneDeep } from 'es-toolkit';

/**
 * Production-shaped in-memory repository fallback.
 *
 * @typeParam T - The entity type managed by the repository.
 */
export class InMemoryRepositoryAdapter<
  T extends {
    id?: string;
    deletedAt?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  } = any,
> implements RepositoryPort<T> {
  private readonly store = new Map<string, T>();
  private counter = 0;

  constructor(
    private readonly idGenerator?: IdGenerator,
    private readonly clock?: Clock,
  ) {}

  /**
   * Generates the next identifier.
   *
   * @returns An identifier string.
   */
  private nextId(): string {
    if (this.idGenerator) return this.idGenerator.next();
    this.counter += 1;
    return `inmem-${this.counter}`;
  }

  /**
   * Returns the current time.
   *
   * @returns A date instance.
   */
  private now(): Date {
    if (this.clock) return this.clock.now();
    return new Date();
  }

  /** {@inheritDoc RepositoryPort.findById} */
  async findById(id: string): Promise<T | null> {
    const item = this.store.get(id);
    if (!item || (item.deletedAt as Date | null | undefined)) return null;
    return cloneDeep(item);
  }

  /** {@inheritDoc RepositoryPort.findAll} */
  async findAll(): Promise<T[]> {
    return [...this.store.values()]
      .filter((item) => !(item.deletedAt as Date | null | undefined))
      .map((item) => cloneDeep(item));
  }

  /** {@inheritDoc RepositoryPort.save} */
  async save(entity: T): Promise<T> {
    const id = (entity.id as string | undefined) || this.nextId();
    const now = this.now();
    const existing = this.store.get(id);
    const record = cloneDeep(entity);
    record.id = id;
    if (!record.createdAt) {
      record.createdAt = existing ? cloneDeep(existing.createdAt as Date) : now;
    }
    record.updatedAt = now;
    if (record.deletedAt === undefined) record.deletedAt = null;
    this.store.set(id, record);
    return cloneDeep(record);
  }

  /** {@inheritDoc RepositoryPort.softDelete} */
  async softDelete(id: string): Promise<void> {
    const item = this.store.get(id);
    if (!item) return;
    const now = this.now();
    item.deletedAt = now;
    item.updatedAt = now;
    this.store.set(id, cloneDeep(item));
  }

  /** {@inheritDoc RepositoryPort.restore} */
  async restore(id: string): Promise<void> {
    const item = this.store.get(id);
    if (!item) return;
    item.deletedAt = null;
    item.updatedAt = this.now();
    this.store.set(id, cloneDeep(item));
  }

  /** {@inheritDoc RepositoryPort.count} */
  async count(): Promise<number> {
    return [...this.store.values()].filter(
      (item) => !(item.deletedAt as Date | null | undefined),
    ).length;
  }
}
