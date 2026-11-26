/**
 * @file TypeORM repository adapter with soft-delete support.
 */

import { Injectable } from '@nestjs/common';
import type { EntityTarget, ObjectLiteral } from 'typeorm';
import { EntityManager, Repository } from 'typeorm';
import type { RepositoryPort } from '../../ports/repository.port.js';
import { SoftDeleteEntity } from './soft-delete.entity.js';

/**
 * TypeORM-backed implementation of {@link RepositoryPort}.
 *
 * Accepts either a ready-made TypeORM `Repository` or an `EntityManager`
 * plus an entity target, so it can be wired both directly and through Nest's
 * dependency injection.
 *
 * @typeParam T - The entity type managed by the repository.
 */
@Injectable()
export class TypeOrmRepositoryAdapter<
  T extends ObjectLiteral = SoftDeleteEntity,
> implements RepositoryPort<T> {
  private readonly entityManager?: EntityManager;
  private readonly entityTarget?: EntityTarget<T>;
  private readonly repository?: Repository<T>;

  constructor(
    source: Repository<T> | EntityManager,
    entityTarget?: EntityTarget<T>,
  ) {
    if (entityTarget !== undefined) {
      this.entityManager = source as EntityManager;
      this.entityTarget = entityTarget;
    } else {
      this.repository = source as Repository<T>;
    }
  }

  /**
   * Resolves the underlying TypeORM repository.
   *
   * @returns The repository instance.
   */
  private getRepository(): Repository<T> {
    if (this.repository) {
      return this.repository;
    }
    return (this.entityManager as EntityManager).getRepository(
      this.entityTarget as EntityTarget<T>,
    );
  }

  /** {@inheritDoc RepositoryPort.findById} */
  async findById(id: string): Promise<T | null> {
    return this.getRepository().findOne({ where: { id } as never });
  }

  /** {@inheritDoc RepositoryPort.findAll} */
  async findAll(): Promise<T[]> {
    return this.getRepository().find();
  }

  /** {@inheritDoc RepositoryPort.save} */
  async save(entity: T): Promise<T> {
    return this.getRepository().save(entity);
  }

  /** {@inheritDoc RepositoryPort.softDelete} */
  async softDelete(id: string): Promise<void> {
    await this.getRepository().softDelete(id);
  }

  /** {@inheritDoc RepositoryPort.restore} */
  async restore(id: string): Promise<void> {
    await this.getRepository().restore(id);
  }

  /** {@inheritDoc RepositoryPort.count} */
  async count(): Promise<number> {
    return this.getRepository().count();
  }
}
