/**
 * @file Token issuance and verification port.
 */
export type Claims = {
  [key: string]: unknown;
};

export interface TokenIssuer {
  issue(payload: Claims): Promise<string>;
  verify(token: string): Promise<Claims>;
}

export type TokenIssuerPort = TokenIssuer;
export type TokenClaims = Claims;
