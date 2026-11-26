/**
 * @file Architecture guard: src/common never imports context domain code.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { checkCommonDomainFree, scanSource } from './lib/import-scanner.js';

const COMMON_DIR = join(process.cwd(), 'src', 'common');

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

describe('common domain-free', () => {
  it('no src/common file imports a context domain', () => {
    const files = walk(COMMON_DIR).filter(
      (f) =>
        f.endsWith('.ts') &&
        !f.endsWith('.spec.ts') &&
        !f.endsWith('.e2e-spec.ts'),
    );
    const records = files.flatMap((f) =>
      scanSource(readFileSync(f, 'utf8'), f),
    );
    const violations = checkCommonDomainFree(records);
    expect(violations).toEqual([]);
  });

  it('allows a type-only import of the shared domain barrel', () => {
    const file = join(COMMON_DIR, 'filters', 'x.ts');
    const source =
      "import type { DomainError } from '../../modules/shared/domain/index.js';";
    const records = scanSource(source, file);
    const violations = checkCommonDomainFree(records);
    expect(violations).toEqual([]);
  });

  it('detects a runtime domain import via a stubbed file reader', () => {
    const reader = vi.fn(
      () => "import { User } from '../modules/user/domain/user.entity.js';",
    );
    const file = join(COMMON_DIR, 'x.ts');
    const records = scanSource(reader(), file);
    const violations = checkCommonDomainFree(records);
    expect(violations.length).toBeGreaterThan(0);
    expect(reader).toHaveBeenCalled();
  });
});
