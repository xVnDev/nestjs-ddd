/**
 * @file Password hashing port.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, digest: string): Promise<boolean>;
}

export type PasswordHasherPort = PasswordHasher;
