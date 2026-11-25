import { describe, expect, it } from 'vitest';
import config from '../vitest.config.js';

describe('coverage gate', () => {
  it('has thresholds configured', () => {
    const thresholds = (config as any).test?.coverage?.thresholds;
    expect(thresholds).toBeDefined();
    expect(thresholds.statements).toBe(100);
    expect(thresholds.branches).toBe(80);
    expect(thresholds.functions).toBe(100);
    expect(thresholds.lines).toBe(100);
  });
});
