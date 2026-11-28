/**
 * @file User repository port.
 */

import type { Sub } from '../../user/domain/value-objects/sub.vo.js';
import type { User } from '../../user/domain/entities/user.entity.js';

/**
 * Narrow repository contract for the {@link User} aggregate.
 */
export interface UserRepository {
  save(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findBySub(sub: Sub): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(options?: { page?: number; pageSize?: number }): Promise<User[]>;
  softDelete(id: string): Promise<void>;
}

export type UserRepositoryPort = UserRepository;
