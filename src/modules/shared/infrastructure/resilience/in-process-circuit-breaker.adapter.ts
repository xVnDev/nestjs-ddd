/**
 * @file In-process circuit breaker adapter implementing CircuitBreakerPort.
 */

import type { CircuitBreakerPort, CircuitState } from '../../ports/circuit-breaker.port.js';
import type { ResilienceConfig } from '../../../../common/config/resilience.config.js';

interface BreakerState {
  state: CircuitState;
  failures: number;
  openedAt: number;
  halfOpenCalls: number;
}

function toMillis(value: Date | number): number {
  return value instanceof Date ? value.getTime() : Number(value);
}

function parseClock(value: unknown): { now(): number } {
  if (value && typeof value === 'object' && typeof (value as { now?: unknown }).now === 'function') {
    const v = value as { now: () => Date | number };
    return { now: () => toMillis(v.now()) };
  }
  return { now: () => Date.now() };
}

function parseConfig(args: unknown[]): {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
  clock: { now(): number };
} {
  let failureThreshold = 3;
  let resetTimeoutMs = 30000;
  let halfOpenMaxCalls = 1;
  let clock: { now(): number } = { now: () => Date.now() };

  const first = args[0];
  if (typeof first === 'number') {
    failureThreshold = first;
    if (typeof args[1] === 'number') resetTimeoutMs = args[1];
    if (typeof args[2] === 'number') halfOpenMaxCalls = args[2];
    if (args[3] !== undefined) clock = parseClock(args[3]);
    return { failureThreshold, resetTimeoutMs, halfOpenMaxCalls, clock };
  }

  if (first && typeof first === 'object') {
    const o = first as Record<string, unknown>;
    if (typeof o.failureThreshold === 'number') failureThreshold = o.failureThreshold;
    if (typeof o.resetTimeoutMs === 'number') resetTimeoutMs = o.resetTimeoutMs;
    if (typeof o.halfOpenMaxCalls === 'number') halfOpenMaxCalls = o.halfOpenMaxCalls;
    if (o.config && typeof o.config === 'object') {
      const c = o.config as Partial<ResilienceConfig>;
      if (typeof c.failureThreshold === 'number') failureThreshold = c.failureThreshold;
      if (typeof c.resetTimeoutMs === 'number') resetTimeoutMs = c.resetTimeoutMs;
      if (typeof c.halfOpenMaxCalls === 'number') halfOpenMaxCalls = c.halfOpenMaxCalls;
    }
    if (o.resilience && typeof o.resilience === 'object') {
      const c = o.resilience as Partial<ResilienceConfig>;
      if (typeof c.failureThreshold === 'number') failureThreshold = c.failureThreshold;
      if (typeof c.resetTimeoutMs === 'number') resetTimeoutMs = c.resetTimeoutMs;
      if (typeof c.halfOpenMaxCalls === 'number') halfOpenMaxCalls = c.halfOpenMaxCalls;
    }
    if (o.clock !== undefined) clock = parseClock(o.clock);
    if (args[1] !== undefined) clock = parseClock(args[1]);
  }
  return { failureThreshold, resetTimeoutMs, halfOpenMaxCalls, clock };
}

export class InProcessCircuitBreakerAdapter implements CircuitBreakerPort {
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxCalls: number;
  private readonly clock: { now(): number };
  private readonly states = new Map<string, BreakerState>();

  constructor(...args: unknown[]) {
    const parsed = parseConfig(args);
    this.failureThreshold = parsed.failureThreshold;
    this.resetTimeoutMs = parsed.resetTimeoutMs;
    this.halfOpenMaxCalls = parsed.halfOpenMaxCalls;
    this.clock = parsed.clock;
  }

  private getRecord(key: string): BreakerState {
    let rec = this.states.get(key);
    if (!rec) {
      rec = { state: 'CLOSED', failures: 0, openedAt: 0, halfOpenCalls: 0 };
      this.states.set(key, rec);
    }
    return rec;
  }

  private maybeTransition(rec: BreakerState): void {
    if (rec.state === 'OPEN') {
      if (this.clock.now() - rec.openedAt >= this.resetTimeoutMs) {
        rec.state = 'HALF_OPEN';
        rec.halfOpenCalls = 0;
      }
    }
  }

  /** {@inheritDoc CircuitBreakerPort.state} */
  state(key: string): CircuitState {
    const rec = this.getRecord(key);
    this.maybeTransition(rec);
    return rec.state;
  }

  /** {@inheritDoc CircuitBreakerPort.execute} */
  async execute<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const rec = this.getRecord(key);
    this.maybeTransition(rec);

    if (rec.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }
    if (rec.state === 'HALF_OPEN' && rec.halfOpenCalls >= this.halfOpenMaxCalls) {
      throw new Error('Circuit breaker is OPEN');
    }
    if (rec.state === 'HALF_OPEN') {
      rec.halfOpenCalls += 1;
    }

    try {
      const result = await operation();
      // success
      rec.failures = 0;
      rec.state = 'CLOSED';
      rec.halfOpenCalls = 0;
      return result;
    } catch (error) {
      rec.failures += 1;
      if (rec.state === 'HALF_OPEN') {
        rec.state = 'OPEN';
        rec.openedAt = this.clock.now();
      } else if (rec.failures >= this.failureThreshold) {
        rec.state = 'OPEN';
        rec.openedAt = this.clock.now();
      }
      throw error;
    }
  }
}