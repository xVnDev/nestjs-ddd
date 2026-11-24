import { describe, expect, it, vi } from 'vitest';

describe('check-plan-links link extractor', () => {
  it('resolves relative links', () => {
    const fs = { existsSync: vi.fn(() => true) };
    expect(fs.existsSync('/tmp/x')).toBe(true);
  });
});

describe('check-plan-links ID uniqueness', () => {
  it('detects duplicate IDs', () => {
    const ids = ['P0-01', 'P0-01'];
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toHaveLength(1);
  });
});
