/**
 * @file Guard test forbidding raw process.env outside config.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Recursively collects TypeScript files under a directory.
 *
 * @param dir - Directory to walk.
 * @returns List of TypeScript file paths.
 */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('no raw process.env outside config', () => {
  it('has no process.env usage in src except config', () => {
    const root = join(process.cwd(), 'src');
    const files = walk(root).filter(
      (f) => !relative(root, f).startsWith('common/config'),
    );
    const offenders: string[] = [];
    for (const f of files) {
      const content = readFileSync(f, 'utf8');
      if (/process\.env/.test(content)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
