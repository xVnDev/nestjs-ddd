/**
 * @file Architecture guard: domain layer purity (no framework imports).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  checkDomainPurity,
  scanSource,
} from './lib/import-scanner.js';

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

describe('domain purity', () => {
  it('every domain file is framework-free', () => {
    const files = walk(MODULES_DIR)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => /\/domain\//.test(f.replace(/\\/g, '/')));
    const records = files.flatMap((f) =>
      scanSource(readFileSync(f, 'utf8'), f),
    );
    const violations = checkDomainPurity(records);
    expect(violations).toEqual([]);
  });

  it('detects a forbidden import via a stubbed file reader', () => {
    const reader = vi.fn(() => "import { Module } from '@nestjs/common';");
    const file = join(MODULES_DIR, 'user', 'domain', 'foo.ts');
    const records = scanSource(reader(), file);
    const violations = checkDomainPurity(records);
    expect(violations.length).toBeGreaterThan(0);
    expect(reader).toHaveBeenCalled();
  });
});
