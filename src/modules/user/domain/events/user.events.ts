/**
 * @file Domain events emitted by the {@link User} aggregate.
 */

import type { Sub } from '../value-objects/sub.vo.js';

/** Base shape shared by all user domain events. */
export interface UserDomainEvent {
  readonly occurredAt: Date;
}

export class UserCreatedEvent implements UserDomainEvent {
  public readonly occurredAt: Date;
  public constructor(
    public readonly userId: string,
    public readonly sub: Sub,
    public readonly email: string,
    occurredAt: Date = new Date(),
  ) {
    this.occurredAt = occurredAt;
  }
}

export class UserEmailChangedEvent implements UserDomainEvent {
  public readonly occurredAt: Date;
  public constructor(
    public readonly userId: string,
    public readonly oldEmail: string,
    public readonly newEmail: string,
    occurredAt: Date = new Date(),
  ) {
    this.occurredAt = occurredAt;
  }
}

export class UserPasswordChangedEvent implements UserDomainEvent {
  public readonly occurredAt: Date;
  public constructor(
    public readonly userId: string,
    occurredAt: Date = new Date(),
  ) {
    this.occurredAt = occurredAt;
  }
}

export class UserActivatedEvent implements UserDomainEvent {
  public readonly occurredAt: Date;
  public constructor(
    public readonly userId: string,
    occurredAt: Date = new Date(),
  ) {
    this.occurredAt = occurredAt;
  }
}

export class UserDeactivatedEvent implements UserDomainEvent {
  public readonly occurredAt: Date;
  public constructor(
    public readonly userId: string,
    occurredAt: Date = new Date(),
  ) {
    this.occurredAt = occurredAt;
  }
}

// Short aliases for convenience / compatibility.
export const EmailChangedEvent = UserEmailChangedEvent;
export const PasswordChangedEvent = UserPasswordChangedEvent;
export const ActivatedEvent = UserActivatedEvent;
export const DeactivatedEvent = UserDeactivatedEvent;
export const CreatedEvent = UserCreatedEvent;
