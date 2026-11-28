/**
 * @file TypeORM user repository adapter.
 */

import { Injectable } from '@nestjs/common';
import type { EntityTarget } from 'typeorm';
import { EntityManager, Repository } from 'typeorm';
import type { UserRepository } from '../../../shared/ports/user-repository.port.js';
import { User } from '../../domain/entities/user.entity.js';
import { Sub } from '../../domain/value-objects/sub.vo.js';
import { UserUniquenessService } from '../../domain/services/user-uniqueness.service.js';
import { UserOrmEntity } from '../persistence/user.orm-entity.js';

@Injectable()
export class TypeOrmUserRepositoryAdapter implements UserRepository {
  private readonly entityManager?: EntityManager;
  private readonly entityTarget?: EntityTarget<UserOrmEntity>;
  private readonly repository?: Repository<UserOrmEntity>;

  constructor(
    source: Repository<UserOrmEntity> | EntityManager,
    entityTarget?: EntityTarget<UserOrmEntity>,
  ) {
    if (entityTarget !== undefined) {
      this.entityManager = source as EntityManager;
      this.entityTarget = entityTarget;
    } else {
      this.repository = source as Repository<UserOrmEntity>;
    }
  }

  private getRepository(): Repository<UserOrmEntity> {
    if (this.repository) return this.repository;
    return (this.entityManager as EntityManager).getRepository(
      this.entityTarget as EntityTarget<UserOrmEntity>,
    );
  }

  private toOrm(user: User): UserOrmEntity {
    const row = new UserOrmEntity();
    row.id = user.id;
    row.sub = user.sub.toString();
    row.email = user.email;
    row.passwordHash = user.passwordHash;
    row.isActive = user.isActive;
    row.createdAt = user.createdAt;
    row.updatedAt = user.updatedAt;
    row.deletedAt = null;
    return row;
  }

  private toDomain(row: UserOrmEntity): User {
    return new User({
      id: row.id,
      sub: new Sub(row.sub),
      email: row.email,
      passwordHash: row.passwordHash,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async save(user: User): Promise<User> {
    UserUniquenessService.assertUnique([user]);
    const row = this.toOrm(user);
    const saved = await this.getRepository().save(row);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.getRepository().findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findBySub(sub: Sub): Promise<User | null> {
    const row = await this.getRepository().findOne({ where: { sub: sub.toString() } });
    return row ? this.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.getRepository().findOne({ where: { email: email.trim().toLowerCase() } });
    return row ? this.toDomain(row) : null;
  }

  async findAll(options?: { page?: number; pageSize?: number }): Promise<User[]> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const rows = await this.getRepository().find({
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async softDelete(id: string): Promise<void> {
    await this.getRepository().softDelete(id);
  }
}
