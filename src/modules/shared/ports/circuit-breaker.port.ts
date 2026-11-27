/**
 * @file Circuit breaker port.
 */

import { CIRCUIT_BREAKER_PORT } from './tokens.js';

export { CIRCUIT_BREAKER_PORT };

/** Circuit breaker states. */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** Narrow circuit breaker port. */
export interface CircuitBreakerPort {
  execute<T>(key: string, operation: () => Promise<T>): Promise<T>;
  state(key: string): CircuitState;
}