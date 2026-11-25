/**
 * @file Tests for .env.example documentation and secret hygiene.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('.env.example', () => {
  it('documents required keys', () => {
    const content = readFileSync(join(process.cwd(), '.env.example'), 'utf8');
    expect(content).toContain('PORT=');
    expect(content).toContain('NODE_ENV=');
  });

  it('has no secrets', () => {
    const content = readFileSync(join(process.cwd(), '.env.example'), 'utf8');
    expect(content).not.toMatch(/password=\S+/i);
    expect(content).not.toMatch(/-----BEGIN/);
  });
});
