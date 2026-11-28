/**
 * @file Login use case.
 */

import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY } from '../../shared/ports/tokens.js';
import type { UserRepository } from '../../shared/ports/user-repository.port.js';
import { UnauthorizedDomainError } from '../../shared/domain/domain-error.js';
import type { AuthenticatedPrincipal, AuthResult } from '../domain/types/auth.types.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class LoginUseCase {
  public constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  public async execute(principal: AuthenticatedPrincipal): Promise<AuthResult> {
    const user = await this.users.findById(principal.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedDomainError('Invalid credentials');
    }

    return {
      principal,
      session: randomUUID(),
    };
  }
}
