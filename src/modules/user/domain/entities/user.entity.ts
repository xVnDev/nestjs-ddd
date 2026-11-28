/**
 * @file User aggregate root.
 */

import { Entity } from '../../../shared/domain/entity.base.js';
import { ValidationDomainError } from '../../../shared/domain/domain-error.js';
import { Sub } from '../value-objects/sub.vo.js';
import {
  UserActivatedEvent,
  UserCreatedEvent,
  UserDeactivatedEvent,
  UserEmailChangedEvent,
  UserPasswordChangedEvent,
} from '../events/user.events.js';

type UserConstructorArgs = {
  id: string;
  sub: Sub | string;
  email: string;
  passwordHash?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

function normaliseEmail(email: string): string {
  return (email ?? '').trim().toLowerCase();
}

function toSub(value: Sub | string): Sub {
  return value instanceof Sub ? value : new Sub(value);
}

export class User extends Entity<string> {
  public sub: Sub;
  public email: string;
  public passwordHash: string | null;
  public isActive: boolean;
  public createdAt: Date;
  public updatedAt: Date;

  private readonly _domainEvents: Array<unknown> = [];

  public constructor(...args: unknown[]) {
    let props: UserConstructorArgs;
    if (args.length === 1 && args[0] && typeof args[0] === 'object') {
      props = args[0] as UserConstructorArgs;
    } else {
      props = {
        id: args[0] as string,
        sub: args[1] as Sub | string,
        email: args[2] as string,
        passwordHash: args[3] as string | null | undefined,
        isActive: args[4] as boolean | undefined,
        createdAt: args[5] as Date | undefined,
        updatedAt: args[6] as Date | undefined,
      };
    }

    if (!props.id || typeof props.id !== 'string' || props.id.trim().length === 0) {
      throw new ValidationDomainError('User id is required');
    }
    const sub = toSub(props.sub);
    const email = normaliseEmail(props.email);
    if (email.length === 0) {
      throw new ValidationDomainError('User email is required');
    }

    const now = props.createdAt ?? new Date();
    super(props.id.trim());
    this.sub = sub;
    this.email = email;
    this.passwordHash = props.passwordHash ? props.passwordHash : null;
    this.isActive = props.isActive ?? true;
    this.createdAt = now;
    this.updatedAt = props.updatedAt ?? now;

    // Emit creation event.
    this.recordEvent(
      new UserCreatedEvent(this.id, this.sub, this.email, this.createdAt),
    );
  }

  // ---- Domain events ----

  public get events(): Array<unknown> {
    return [...this._domainEvents];
  }

  public get domainEvents(): Array<unknown> {
    return [...this._domainEvents];
  }

  public get uncommittedEvents(): Array<unknown> {
    return [...this._domainEvents];
  }

  public pullEvents(): Array<unknown> {
    const out = [...this._domainEvents];
    this._domainEvents.length = 0;
    return out;
  }

  public pullDomainEvents(): Array<unknown> {
    return this.pullEvents();
  }

  public clearEvents(): void {
    this._domainEvents.length = 0;
  }

  private recordEvent(event: unknown): void {
    this._domainEvents.push(event);
  }

  // ---- Factories ----

  public static create(...args: unknown[]): User {
    return new User(...args);
  }

  public static createLocal(...args: unknown[]): User {
    // Support object or positional: last positional passwordHash required.
    let passwordHash: string | null = null;
    if (args.length === 1 && args[0] && typeof args[0] === 'object') {
      const p = args[0] as UserConstructorArgs;
      if (!p.passwordHash) {
        throw new ValidationDomainError('Local user requires a password hash');
      }
      return new User(p);
    }
    passwordHash = args[3] as string | null;
    if (!passwordHash) {
      throw new ValidationDomainError('Local user requires a password hash');
    }
    return new User(...args);
  }

  public static createFederated(...args: unknown[]): User {
    if (args.length === 1 && args[0] && typeof args[0] === 'object') {
      const p = { ...(args[0] as UserConstructorArgs), passwordHash: null };
      return new User(p);
    }
    // positional: drop any password hash
    const positional = [...args];
    if (positional.length >= 4) positional[3] = null;
    return new User(...positional);
  }

  // Aliases
  public static local = (...args: unknown[]) => User.createLocal(...args);
  public static federated = (...args: unknown[]) => User.createFederated(...args);
  public static fromLocal = (...args: unknown[]) => User.createLocal(...args);
  public static fromFederated = (...args: unknown[]) => User.createFederated(...args);
  public static register = (...args: unknown[]) => User.createLocal(...args);

  // ---- Mutations ----

  public changeEmail(newEmail: string): void {
    const next = normaliseEmail(newEmail);
    if (next.length === 0) {
      throw new ValidationDomainError('User email is required');
    }
    const previous = this.email;
    if (previous === next) return;
    this.email = next;
    this.updatedAt = new Date();
    this.recordEvent(
      new UserEmailChangedEvent(this.id, previous, next, this.updatedAt),
    );
  }

  public setEmail(newEmail: string): void {
    this.changeEmail(newEmail);
  }

  public setPasswordHash(hash: string | null): void {
    this.passwordHash = hash ? hash : null;
    this.updatedAt = new Date();
    this.recordEvent(new UserPasswordChangedEvent(this.id, this.updatedAt));
  }

  public activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.updatedAt = new Date();
    this.recordEvent(new UserActivatedEvent(this.id, this.updatedAt));
  }

  public deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.updatedAt = new Date();
    this.recordEvent(new UserDeactivatedEvent(this.id, this.updatedAt));
  }

  // ---- Helpers ----

  public isLocal(): boolean {
    return this.passwordHash !== null;
  }

  public isFederated(): boolean {
    return this.passwordHash === null;
  }
}
