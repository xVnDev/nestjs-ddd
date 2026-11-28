/**
 * @file In-memory user repository fallback adapter.
 */

import { cloneDeep } from 'es-toolkit';
import type { UserRepository } from '../../../shared/ports/user-repository.port.js';
import type { User } from '../../domain/entities/user.entity.js';
import { UserUniquenessService } from '../../domain/services/user-uniqueness.service.js';

export class MemoryUserRepositoryAdapter implements UserRepository {
  private readonly store = new Map<string, User>();
  private readonly deleted = new Map<string, Date>();

  async save(user: User): Promise<User> {
    UserUniquenessService.assertUnique([user]);
    const id = user.id;
    const record = cloneDeep(user);
    this.store.set(id, record);
    this.deleted.delete(id);
    return cloneDeep(record);
  }

  async findById(id: string): Promise<User | null> {
    if (this.deleted.has(id)) return null;
    const item = this.store.get(id);
    return item ? cloneDeep(item) : null;
  }

  async findBySub(sub: User['sub']): Promise<User | null> {
    for (const [id, item] of this.store) {
      if (this.deleted.has(id)) continue;
      if (item.sub.equals(sub)) return cloneDeep(item);
    }
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    for (const [id, item] of this.store) {
      if (this.deleted.has(id)) continue;
      if (item.email === normalized) return cloneDeep(item);
    }
    return null;
  }

  async findAll(options?: { page?: number; pageSize?: number }): Promise<User[]> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const items = [...this.store.entries()]
      .filter(([id]) => !this.deleted.has(id))
      .map(([, item]) => cloneDeep(item));
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  async softDelete(id: string): Promise<void> {
    if (!this.store.has(id)) return;
    this.deleted.set(id, new Date());
  }
}
