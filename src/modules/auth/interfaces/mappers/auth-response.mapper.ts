/**
 * @file Auth response mapper.
 */

import type { AuthResult } from '../../domain/types/auth.types.js';

export interface AuthResponse {
  principal: AuthResult['principal'];
  session: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  kid?: string;
}

export function toAuthResponse(result: AuthResult): AuthResponse {
  return {
    principal: result.principal,
    session: result.session,
    accessToken: result.accessToken ?? result.tokens?.accessToken,
    refreshToken: result.refreshToken ?? result.tokens?.refreshToken,
    expiresIn: result.expiresIn ?? result.tokens?.expiresIn,
    kid: result.kid ?? result.tokens?.kid,
  };
}
