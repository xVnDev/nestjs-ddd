/**
 * @file Architecture guard: inward-only layer dependencies.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { checkInwardDependencies, scanSource } from './lib/import-scanner.js';

const MODULES_DIR = join(process.cwd(), 'src', 'modules');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

describe('inward dependencies', () => {
  it('all context modules respect inward-only imports', () => {
    const files = walk(MODULES_DIR).filter((f) => f.endsWith('.ts'));
    const records = files.flatMap((f) =>
      scanSource(readFileSync(f, 'utf8'), f),
    );
    const violations = checkInwardDependencies(records);
    expect(violations).toEqual([]);
  });

  it('detects an application -> infrastructure import via a stubbed reader', () => {
    const reader = vi.fn(() => "import { x } from '../infrastructure/foo.js';");
    const file = join(MODULES_DIR, 'user', 'application', 'bar.ts');
    const records = scanSource(reader(), file);
    const violations = checkInwardDependencies(records);
    expect(violations.length).toBeGreaterThan(0);
    expect(reader).toHaveBeenCalled();
  });
});
