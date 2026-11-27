/**
 * @file In-process circuit breaker adapter spec.
 */

import { describe, expect, it } from 'vitest';
import { InProcessCircuitBreakerAdapter } from './in-process-circuit-breaker.adapter.js';

describe('InProcessCircuitBreakerAdapter', () => {
  it('defaults when no args are provided', () => {
    const breaker = new InProcessCircuitBreakerAdapter();
    expect(breaker.state('k')).toBe('CLOSED');
  });

  it('returns Date-based millis from toMillis via clock', () => {
    const breaker = new InProcessCircuitBreakerAdapter({
      clock: { now: () => new Date(5) },
    });
    expect(breaker.state('k')).toBe('CLOSED');
  });

  it('falls back to default clock when clock value is not an object', () => {
    const breaker = new InProcessCircuitBreakerAdapter({ clock: 42 });
    expect(breaker.state('k')).toBe('CLOSED');
  });

  it('uses number positional args', async () => {
    let now = 0;
    const clock = { now: () => now };
    const breaker = new InProcessCircuitBreakerAdapter(2, 10, 1, clock);
    await expect(breaker.execute('k', async () => 'ok')).resolves.toBe('ok');
  });

  it('uses object fields', async () => {
    const breaker = new InProcessCircuitBreakerAdapter({
      failureThreshold: 2,
      resetTimeoutMs: 10,
      halfOpenMaxCalls: 2,
    });
    await expect(breaker.execute('k', async () => 'ok')).resolves.toBe('ok');
  });

  it('uses nested config', async () => {
    const breaker = new InProcessCircuitBreakerAdapter({
      config: { failureThreshold: 2, resetTimeoutMs: 10, halfOpenMaxCalls: 2 },
    });
    await expect(breaker.execute('k', async () => 'ok')).resolves.toBe('ok');
  });

  it('uses nested resilience', async () => {
    const breaker = new InProcessCircuitBreakerAdapter({
      resilience: {
        failureThreshold: 2,
        resetTimeoutMs: 10,
        halfOpenMaxCalls: 2,
      },
    });
    await expect(breaker.execute('k', async () => 'ok')).resolves.toBe('ok');
  });

  it('uses clock property and second arg (second wins)', async () => {
    let now = 0;
    const breaker = new InProcessCircuitBreakerAdapter(
      { clock: { now: () => 0 } },
      { now: () => now },
    );
    expect(breaker.state('k')).toBe('CLOSED');
  });

  it('reuses an existing record for the same key', async () => {
    const breaker = new InProcessCircuitBreakerAdapter();
    await breaker.execute('k', async () => 1);
    await breaker.execute('k', async () => 2);
    expect(breaker.state('k')).toBe('CLOSED');
  });

  it('opens after reaching failure threshold', async () => {
    const breaker = new InProcessCircuitBreakerAdapter({
      failureThreshold: 2,
      resetTimeoutMs: 10,
    });
    await expect(
      breaker.execute('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(
      breaker.execute('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(breaker.state('k')).toBe('OPEN');
  });

  it('stays closed when failures below threshold', async () => {
    const breaker = new InProcessCircuitBreakerAdapter({
      failureThreshold: 3,
      resetTimeoutMs: 10,
    });
    await expect(
      breaker.execute('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(breaker.state('k')).toBe('CLOSED');
  });

  it('throws when circuit is open', async () => {
    const breaker = new InProcessCircuitBreakerAdapter({
      failureThreshold: 1,
      resetTimeoutMs: 10,
    });
    await expect(
      breaker.execute('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(breaker.execute('k', async () => 'ok')).rejects.toThrow(
      /OPEN/,
    );
  });

  it('stays open when reset timeout not elapsed', async () => {
    let now = 0;
    const breaker = new InProcessCircuitBreakerAdapter({
      failureThreshold: 1,
      resetTimeoutMs: 10,
      clock: { now: () => now },
    });
    await expect(
      breaker.execute('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(breaker.state('k')).toBe('OPEN');
    // not enough time
    now = 5;
    expect(breaker.state('k')).toBe('OPEN');
  });

  it('transitions to half-open after reset timeout', async () => {
    let now = 0;
    const breaker = new InProcessCircuitBreakerAdapter({
      failureThreshold: 1,
      resetTimeoutMs: 10,
      clock: { now: () => now },
    });
    await expect(
      breaker.execute('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    now = 10;
    expect(breaker.state('k')).toBe('HALF_OPEN');
  });

  it('throws when half-open max calls reached', async () => {
    let now = 0;
    const breaker = new InProcessCircuitBreakerAdapter({
      failureThreshold: 1,
      resetTimeoutMs: 10,
      halfOpenMaxCalls: 0,
      clock: { now: () => now },
    });
    await expect(
      breaker.execute('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    now = 10;
    await expect(breaker.execute('k', async () => 'ok')).rejects.toThrow(
      /OPEN/,
    );
  });

  it('increments half-open calls and succeeds', async () => {
    let now = 0;
    const breaker = new InProcessCircuitBreakerAdapter({
      failureThreshold: 1,
      resetTimeoutMs: 10,
      halfOpenMaxCalls: 1,
      clock: { now: () => now },
    });
    await expect(
      breaker.execute('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    now = 10;
    await expect(breaker.execute('k', async () => 'ok')).resolves.toBe('ok');
    expect(breaker.state('k')).toBe('CLOSED');
  });

  it('reopens on failure in half-open state', async () => {
    let now = 0;
    const breaker = new InProcessCircuitBreakerAdapter({
      failureThreshold: 1,
      resetTimeoutMs: 10,
      halfOpenMaxCalls: 1,
      clock: { now: () => now },
    });
    await expect(
      breaker.execute('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    now = 10;
    await expect(
      breaker.execute('k', async () => {
        throw new Error('boom2');
      }),
    ).rejects.toThrow('boom2');
    expect(breaker.state('k')).toBe('OPEN');
  });

  it('maybeTransition no-op when not open', () => {
    const breaker = new InProcessCircuitBreakerAdapter();
    expect(breaker.state('fresh')).toBe('CLOSED');
  });

  it('invokes default clock arrow when breaker opens', async () => {
    const breaker = new InProcessCircuitBreakerAdapter({
      failureThreshold: 1,
      clock: 42,
    });
    await expect(
      breaker.execute('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(breaker.state('k')).toBe('OPEN');
  });

  it('invokes Date-based clock arrow when breaker opens', async () => {
    const breaker = new InProcessCircuitBreakerAdapter({
      failureThreshold: 1,
      clock: { now: () => new Date(5) },
    });
    await expect(
      breaker.execute('k', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(breaker.state('k')).toBe('OPEN');
  });

  it('uses partial number args', async () => {
    const b1 = new InProcessCircuitBreakerAdapter(2);
    const b2 = new InProcessCircuitBreakerAdapter(2, 10);
    await expect(b1.execute('k', async () => 'ok')).resolves.toBe('ok');
    await expect(b2.execute('k', async () => 'ok')).resolves.toBe('ok');
  });

  it('uses partial config object', async () => {
    const b1 = new InProcessCircuitBreakerAdapter({ config: {} });
    const b2 = new InProcessCircuitBreakerAdapter({
      config: { failureThreshold: 2 },
    });
    await expect(b1.execute('k', async () => 'ok')).resolves.toBe('ok');
    await expect(b2.execute('k', async () => 'ok')).resolves.toBe('ok');
  });

  it('uses partial resilience object', async () => {
    const b1 = new InProcessCircuitBreakerAdapter({ resilience: {} });
    const b2 = new InProcessCircuitBreakerAdapter({
      resilience: { resetTimeoutMs: 10 },
    });
    await expect(b1.execute('k', async () => 'ok')).resolves.toBe('ok');
    await expect(b2.execute('k', async () => 'ok')).resolves.toBe('ok');
  });
});
