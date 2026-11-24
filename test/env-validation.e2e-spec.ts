import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('env validation (e2e)', () => {
  it('fails fast on invalid env', () => {
    const result = spawnSync('npx', ['nest', 'start'], {
      env: { ...process.env, NODE_ENV: 'production', PORT: 'not-a-number' },
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(result.status).not.toBe(0);
  });
});
