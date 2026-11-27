/**
 * @file Circuit breaker conformance spec.
 */

import { expect, it, vi } from 'vitest';
import { definePortConformance } from '../../testing/conformance.js';
import type { PortAdapterEntry } from '../../testing/conformance.js';
import type { CircuitBreakerPort } from '../../ports/circuit-breaker.port.js';
import { InProcessCircuitBreakerAdapter } from './in-process-circuit-breaker.adapter.js';
import { PassThroughCircuitBreakerAdapter } from './pass-through-circuit-breaker.adapter.js';

const clock = { now: vi.fn(() => 0) };

const adapters: ReadonlyArray<PortAdapterEntry<CircuitBreakerPort>> = [
  {
    name: 'InProcess',
    create: () =>
      new InProcessCircuitBreakerAdapter({
        failureThreshold: 2,
        resetTimeoutMs: 1000,
        halfOpenMaxCalls: 1,
        clock,
      }),
  },
  {
    name: 'PassThrough',
    create: () => new PassThroughCircuitBreakerAdapter(),
  },
];

definePortConformance<CircuitBreakerPort>('CircuitBreaker', adapters, (getAdapter) => {
  it('executes operation and returns result', async () => {
    const breaker = getAdapter();
    const result = await breaker.execute('k', async () => 42);
    expect(result).toBe(42);
  });

  it('state returns a string', () => {
    const breaker = getAdapter();
    expect(typeof breaker.state('k')).toBe('string');
  });
});