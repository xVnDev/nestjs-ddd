/**
 * @file DI token registry for the shared kernel ports.
 *
 * Tokens are `Symbol.for(...)` values so they are debuggable and stable across
 * bundles. Each token is branded with its port interface via {@link PortToken}
 * so rebinding stays type-safe.
 */
import type { PasswordHasher } from './password-hasher.port.js';
import type { EncryptionService } from './encryption-service.port.js';
import type { TokenIssuer } from './token-issuer.port.js';
import type { IdGenerator } from './id-generator.port.js';
import type { Clock } from './clock.port.js';
import type { Cache } from './cache.port.js';
import type { Queue } from './queue.port.js';
import type { Mail } from './mail.port.js';

/**
 * Branded helper that binds an injection token to its port interface.
 *
 * @typeParam T - The port interface the token represents.
 */
export type PortToken<T> = symbol & { readonly __port: T };

/** Password hashing port token. */
export const PASSWORD_HASHER: PortToken<PasswordHasher> = Symbol.for(
  'PASSWORD_HASHER',
) as PortToken<PasswordHasher>;

/** Token issuance/verification port token. */
export const TOKEN_ISSUER: PortToken<TokenIssuer> = Symbol.for(
  'TOKEN_ISSUER',
) as PortToken<TokenIssuer>;

/** Field-level encryption port token. */
export const ENCRYPTION_SERVICE: PortToken<EncryptionService> = Symbol.for(
  'ENCRYPTION_SERVICE',
) as PortToken<EncryptionService>;

/** Identifier generation port token. */
export const ID_GENERATOR: PortToken<IdGenerator> = Symbol.for(
  'ID_GENERATOR',
) as PortToken<IdGenerator>;

/** Clock port token. */
export const CLOCK: PortToken<Clock> = Symbol.for('CLOCK') as PortToken<Clock>;

/** Cache port token. */
export const CACHE: PortToken<Cache> = Symbol.for('CACHE') as PortToken<Cache>;

/** Queue port token. */
export const QUEUE: PortToken<Queue> = Symbol.for('QUEUE') as PortToken<Queue>;

/** Mail delivery port token. */
export const MAIL: PortToken<Mail> = Symbol.for('MAIL') as PortToken<Mail>;
