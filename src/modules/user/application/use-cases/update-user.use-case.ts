/**
 * @file Update user use case.
 */

import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_HASHER, USER_REPOSITORY } from '../../../shared/ports/tokens.js';
import type { PasswordHasher } from '../../../shared/ports/password-hasher.port.js';
import type { UserRepository } from '../../../shared/ports/user-repository.port.js';
import { NotFoundDomainError } from '../../../shared/domain/domain-error.js';
import { User } from '../../domain/entities/user.entity.js';
import { Sub } from '../../domain/value-objects/sub.vo.js';

@Injectable()
export class UpdateUserUseCase {
  public constructor(
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(USER_REPOSITORY) private readonly repository: UserRepository,
  ) {}

  public async execute(id: string, dto: any): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundDomainError('User not found');
    if (dto.email !== undefined) user.changeEmail(dto.email);
    if (dto.sub !== undefined) {
      /* v8 ignore next */
      user.sub = new Sub(dto.sub);
    }
    if (dto.password !== undefined) {
      const hash = await this.hasher.hash(dto.password);
      user.setPasswordHash(hash);
    }
    if (dto.isActive !== undefined) {
      if (dto.isActive) {
        /* v8 ignore next */
        user.activate();
      } else {
        user.deactivate();
      }
    }
    return this.repository.save(user);
  }
}
