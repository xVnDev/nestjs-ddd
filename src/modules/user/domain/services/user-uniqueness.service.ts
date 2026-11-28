/**
 * @file Cross-user uniqueness invariants for the identity domain.
 */

import { ConflictDomainError } from '../../../shared/domain/domain-error.js';
import { Sub } from '../value-objects/sub.vo.js';
import { User } from '../entities/user.entity.js';

export class UserUniquenessService {
  public static hasDuplicateSub(users: User[]): boolean {
    const seen = new Set<string>();
    for (const user of users) {
      const key = user.sub.toString();
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }

  public static hasDuplicateEmail(users: User[]): boolean {
    const seen = new Set<string>();
    for (const user of users) {
      // "one email per local account": only local (password-bearing) users.
      if (!user.isLocal()) continue;
      const key = user.email;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }

  public static findDuplicateSub(users: User[]): Sub | null {
    const seen = new Set<string>();
    for (const user of users) {
      const key = user.sub.toString();
      if (seen.has(key)) return user.sub;
      seen.add(key);
    }
    return null;
  }

  public static findDuplicateEmail(users: User[]): string | null {
    const seen = new Set<string>();
    for (const user of users) {
      if (!user.isLocal()) continue;
      if (seen.has(user.email)) return user.email;
      seen.add(user.email);
    }
    return null;
  }

  public static assertUniqueSub(users: User[]): void {
    if (this.hasDuplicateSub(users)) {
      throw new ConflictDomainError('Duplicate Sub detected');
    }
  }

  public static assertUniqueEmail(users: User[]): void {
    if (this.hasDuplicateEmail(users)) {
      throw new ConflictDomainError('Duplicate email detected');
    }
  }

  public static assertUnique(users: User[]): void {
    this.assertUniqueSub(users);
    this.assertUniqueEmail(users);
  }

  public static isSubUnique(users: User[]): boolean {
    return !this.hasDuplicateSub(users);
  }

  public static isEmailUnique(users: User[]): boolean {
    return !this.hasDuplicateEmail(users);
  }

  public static isUnique(users: User[]): boolean {
    return this.isSubUnique(users) && this.isEmailUnique(users);
  }

  /** Returns true when two users can be merged into one identity. */
  public static canMerge(a: User, b: User): boolean {
    if (a.sub.equals(b.sub)) return true;
    return a.email === b.email;
  }

  /** Merges two users into a single user (federated-then-local). */
  public static merge(a: User, b: User): User {
    const local = a.isLocal() ? a : b.isLocal() ? b : a;
    const federated = a.isLocal() ? b : a;
    const merged = new User({
      id: local.id ?? federated.id,
      sub: local.sub ?? federated.sub,
      email: local.email || federated.email,
      passwordHash: local.passwordHash,
      isActive: local.isActive || federated.isActive,
      createdAt: local.createdAt ?? federated.createdAt,
      updatedAt: new Date(),
    });
    return merged;
  }

  /** Deduplicates a collection by Sub/email, merging federated+local pairs. */
  public static dedupe(users: User[]): User[] {
    const result: User[] = [];
    for (const user of users) {
      const existing = result.find((r) => this.canMerge(r, user));
      if (existing) {
        const idx = result.indexOf(existing);
        result[idx] = this.merge(existing, user);
      } else {
        result.push(user);
      }
    }
    return result;
  }

  // Instance delegates
  public findDuplicateSub(users: User[]): Sub | null {
    return UserUniquenessService.findDuplicateSub(users);
  }

  public findDuplicateEmail(users: User[]): string | null {
    return UserUniquenessService.findDuplicateEmail(users);
  }

  public hasDuplicateSub(users: User[]): boolean {
    return UserUniquenessService.hasDuplicateSub(users);
  }
  public hasDuplicateEmail(users: User[]): boolean {
    return UserUniquenessService.hasDuplicateEmail(users);
  }
  public assertUniqueSub(users: User[]): void {
    return UserUniquenessService.assertUniqueSub(users);
  }
  public assertUniqueEmail(users: User[]): void {
    return UserUniquenessService.assertUniqueEmail(users);
  }
  public assertUnique(users: User[]): void {
    return UserUniquenessService.assertUnique(users);
  }
  public isUnique(users: User[]): boolean {
    return UserUniquenessService.isUnique(users);
  }

  public isSubUnique(users: User[]): boolean {
    return UserUniquenessService.isSubUnique(users);
  }

  public isEmailUnique(users: User[]): boolean {
    return UserUniquenessService.isEmailUnique(users);
  }
  public canMerge(a: User, b: User): boolean {
    return UserUniquenessService.canMerge(a, b);
  }
  public merge(a: User, b: User): User {
    return UserUniquenessService.merge(a, b);
  }
  public dedupe(users: User[]): User[] {
    return UserUniquenessService.dedupe(users);
  }

  // Aliases
  public static checkUnique = (...args: [User[]]) => UserUniquenessService.assertUnique(...args);
  public static validate = (...args: [User[]]) => UserUniquenessService.assertUnique(...args);
  public static ensureUnique = (...args: [User[]]) => UserUniquenessService.assertUnique(...args);
  public static mergeUsers = (a: User, b: User) => UserUniquenessService.merge(a, b);
  public static resolveMerge = (users: User[]) => UserUniquenessService.dedupe(users);
}
