/**
 * @file Immutable domain types for the auth bounded context.
 */

import type { Sub } from '../../../user/domain/value-objects/sub.vo.js';

/** Plain credentials supplied by a caller. */
export interface Credentials {
  readonly email: string;
  readonly password: string;
}

/** Principal produced after a successful authentication check. */
export interface AuthenticatedPrincipal {
  readonly userId: string;
  readonly sub: Sub;
  readonly email: string;
}

/** Result of a successful login orchestration. */
export interface AuthResult {
  readonly principal: AuthenticatedPrincipal;
  readonly session: string;
  readonly tokens?: {
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly expiresIn: number;
    readonly kid: string;
  };
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly expiresIn?: number;
  readonly kid?: string;
}
