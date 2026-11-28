/**
 * @file List users use case.
 */

import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../shared/ports/tokens.js';
import type { UserRepository } from '../../../shared/ports/user-repository.port.js';
import { User } from '../../domain/entities/user.entity.js';

@Injectable()
export class ListUsersUseCase {
  public constructor(
    @Inject(USER_REPOSITORY) private readonly repository: UserRepository,
  ) {}

  public async execute(query: any): Promise<{ items: User[]; total: number }> {
    const items = await this.repository.findAll({
      page: query.page,
      pageSize: query.limit,
      email: query.email,
      isActive: query.isActive,
    } as any);
    return { items, total: items.length };
  }
}
