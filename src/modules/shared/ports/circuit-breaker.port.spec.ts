/**
 * @file Circuit breaker port spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CIRCUIT_BREAKER_PORT } from './tokens.js';
import type { CircuitBreakerPort } from './circuit-breaker.port.js';

describe('circuit breaker port', () => {
  it('exports a unique token', () => {
    expect(typeof CIRCUIT_BREAKER_PORT).toBe('symbol');
    expect(Symbol.keyFor(CIRCUIT_BREAKER_PORT)).toBe('CIRCUIT_BREAKER_PORT');
  });

  it('is implementable with vi.fn', () => {
    const breaker: CircuitBreakerPort = {
      execute: vi.fn(async (_key, op) => op()),
      state: vi.fn(() => 'CLOSED') as any,
    };
    expect(breaker).toBeDefined();
  });

  it('has no framework imports', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'modules', 'shared', 'ports', 'circuit-breaker.port.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/@nestjs/);
  });
});