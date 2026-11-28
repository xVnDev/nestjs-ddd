/**
 * @file Get user use case.
 */

import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../shared/ports/tokens.js';
import type { UserRepository } from '../../../shared/ports/user-repository.port.js';
import { NotFoundDomainError } from '../../../shared/domain/domain-error.js';
import { User } from '../../domain/entities/user.entity.js';

@Injectable()
export class GetUserUseCase {
  public constructor(
    @Inject(USER_REPOSITORY) private readonly repository: UserRepository,
  ) {}

  public async execute(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundDomainError('User not found');
    return user;
  }
}
