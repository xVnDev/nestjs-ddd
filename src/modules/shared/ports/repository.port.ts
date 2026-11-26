/**
 * @file Repository port.
 */

/**
 * Narrow repository contract for a single aggregate/entity type.
 *
 * @typeParam T - The entity type managed by the repository.
 */
export interface RepositoryPort<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  count(): Promise<number>;
}
