/**
 * @file Create user use case.
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_HASHER,
  USER_REPOSITORY,
} from '../../../shared/ports/tokens.js';
import type { PasswordHasher } from '../../../shared/ports/password-hasher.port.js';
import type { UserRepository } from '../../../shared/ports/user-repository.port.js';
import { User } from '../../domain/entities/user.entity.js';
import { Sub } from '../../domain/value-objects/sub.vo.js';
import { UserUniquenessService } from '../../domain/services/user-uniqueness.service.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class CreateUserUseCase {
  public constructor(
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(USER_REPOSITORY) private readonly repository: UserRepository,
  ) {}

  public async execute(dto: any): Promise<User> {
    const id = randomUUID();
    const sub = dto.sub ? new Sub(dto.sub) : Sub.fromLocal(id);
    const passwordHash = await this.hasher.hash(dto.password);
    const user = User.createLocal({
      id,
      sub,
      email: dto.email,
      passwordHash,
      isActive: dto.isActive ?? true,
    });
    UserUniquenessService.assertUnique([user]);
    return this.repository.save(user);
  }
}
