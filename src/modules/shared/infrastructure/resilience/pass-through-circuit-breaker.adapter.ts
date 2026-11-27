/**
 * @file Pass-through circuit breaker adapter (always closed).
 */

import type { CircuitBreakerPort, CircuitState } from '../../ports/circuit-breaker.port.js';

export class PassThroughCircuitBreakerAdapter implements CircuitBreakerPort {
  async execute<T>(_key: string, operation: () => Promise<T>): Promise<T> {
    return operation();
  }
  state(_key: string): CircuitState {
    return 'CLOSED';
  }
}