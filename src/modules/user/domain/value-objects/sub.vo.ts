/**
 * @file Sub identity value object unifying local and federated identities.
 */

import { ValidationDomainError } from '../../../shared/domain/domain-error.js';
import { ValueObject } from '../../../shared/domain/value-object.base.js';

/** Maximum allowed length of a normalised Sub value. */
const MAX_SUB_LENGTH = 255;

/** Allowed characters in a normalised Sub value. */
const SUB_CHARSET = /^[A-Za-z0-9:._@-]+$/;

/**
 * Immutable value object holding a stable identifier (`sub`) that links a local
 * account to any future federated identities.
 */
export class Sub extends ValueObject<{ value: string }> {
  public constructor(value: string) {
    const normalised = (value ?? '').trim();
    if (normalised.length === 0) {
      throw new ValidationDomainError('Sub must not be empty');
    }
    if (normalised.length > MAX_SUB_LENGTH) {
      throw new ValidationDomainError(
        `Sub must not exceed ${MAX_SUB_LENGTH} characters`,
      );
    }
    if (!SUB_CHARSET.test(normalised)) {
      throw new ValidationDomainError('Sub contains invalid characters');
    }
    super({ value: normalised });
    Object.freeze(this);
  }

  /** Returns the normalised string value. */
  public get value(): string {
    return this.getProps().value;
  }

  /** Returns the normalised string value. */
  public toString(): string {
    return this.value;
  }

  /** Structural equality is inherited from {@link ValueObject}. */
  public override equals(other: unknown): boolean {
    return super.equals(other);
  }

  /** Builds a Sub from a local user id. */
  public static fromLocal(userId: string): Sub {
    const id = (userId ?? '').trim();
    return new Sub(`local:${id}`);
  }

  /** Builds a Sub from a federated provider + subject pair. */
  public static fromFederated(provider: string, subject: string): Sub {
    const p = (provider ?? '').trim().toLowerCase();
    const s = (subject ?? '').trim();
    return new Sub(`${p}:${s}`);
  }
}
