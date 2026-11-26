/**
 * @file Platform port spec.
 */
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { Clock, IdGenerator } from './index.js';

describe('platform ports', () => {
  it('IdGenerator.next returns string', () => {
    expectTypeOf<IdGenerator['next']>().returns.toEqualTypeOf<string>();
  });

  it('Clock.now returns Date', () => {
    expectTypeOf<Clock['now']>().returns.toEqualTypeOf<Date>();
  });

  it('injects deterministic values via vi.fn', () => {
    const fixedDate = new Date('2026-01-01T00:00:00.000Z');
    const idGen: IdGenerator = { next: vi.fn(() => 'fixed-id') };
    const clock: Clock = { now: vi.fn(() => fixedDate) };
    expect(idGen.next()).toBe('fixed-id');
    expect(clock.now()).toBe(fixedDate);
  });
});
