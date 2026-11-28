/**
 * @file Thin Passport local strategy.
 */

import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as LocalStrategyBase } from 'passport-local';
import { PASSWORD_HASHER, USER_REPOSITORY } from '../../shared/ports/tokens.js';
import type { PasswordHasher } from '../../shared/ports/password-hasher.port.js';
import type { UserRepository } from '../../shared/ports/user-repository.port.js';
import type { AuthenticatedPrincipal } from '../domain/types/auth.types.js';

/**
 * Local username/password strategy. All rules are delegated to ports.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(LocalStrategyBase) {
  public constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  public async validate(
    email: string,
    password: string,
  ): Promise<AuthenticatedPrincipal> {
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      email.trim().length === 0 ||
      password.length === 0
    ) {
      throw new BadRequestException();
    }

    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) {
      await this.performDummyVerification(password);
      throw new UnauthorizedException();
    }

    const valid = await this.hasher.verify(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id,
      sub: user.sub,
      email: user.email,
    };
  }

  /**
   * Hook for the timing defence implemented in P08-01.
   *
   * @param _password - Supplied password.
   */
  private async performDummyVerification(_password: string): Promise<void> {
    void _password;
  }
}
