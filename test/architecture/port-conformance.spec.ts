/**
 * @file Port conformance: tokens, purity and one-to-one mapping.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import * as ports from '../../src/modules/shared/ports/index.js';

const PORTS_DIR = join(process.cwd(), 'src', 'modules', 'shared', 'ports');

const TOKENS = [
  'PASSWORD_HASHER',
  'TOKEN_ISSUER',
  'ENCRYPTION_SERVICE',
  'ID_GENERATOR',
  'CLOCK',
  'CACHE_PORT',
  'QUEUE',
  'MAIL',
  'REPOSITORY_PORT',
  'HTTP_CLIENT_PORT',
] as const;

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

function collectImportSpecifiers(source: string): string[] {
  const sf = ts.createSourceFile(
    'virtual.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const specs: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specs.push(node.moduleSpecifier.text);
    }
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specs.push(node.moduleSpecifier.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return specs;
}

function isForbiddenImport(specifier: string): boolean {
  if (specifier.startsWith('@nestjs/')) return true;
  if (specifier === 'typeorm' || specifier.startsWith('typeorm/')) return true;
  if (specifier === 'redis' || specifier.startsWith('redis/')) return true;
  if (specifier === 'bullmq' || specifier.startsWith('bullmq/')) return true;
  if (specifier.includes('infrastructure')) return true;
  return false;
}

function findForbiddenImports(
  files: string[],
  reader: (p: string) => string,
): string[] {
  const offenders: string[] = [];
  for (const f of files) {
    const specs = collectImportSpecifiers(reader(f));
    if (specs.some(isForbiddenImport)) offenders.push(f);
  }
  return offenders;
}

function countExportedInterfaces(source: string): number {
  const sf = ts.createSourceFile(
    'virtual.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  let count = 0;
  ts.forEachChild(sf, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      const mods = node.modifiers ?? [];
      if (mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) count += 1;
    }
  });
  return count;
}

describe('port conformance', () => {
  it('exports all ten tokens', () => {
    for (const name of TOKENS) {
      expect((ports as Record<string, unknown>)[name]).toBeDefined();
    }
    const values = TOKENS.map((n) => (ports as Record<string, unknown>)[n]);
    expect(new Set(values).size).toBe(10);
  });

  it('port layer is import-pure', () => {
    const files = walk(PORTS_DIR).filter((f) => f.endsWith('.ts'));
    const offenders = findForbiddenImports(files, (p) =>
      readFileSync(p, 'utf8'),
    );
    expect(offenders).toEqual([]);
  });

  it('has one interface per token (10 total)', () => {
    const files = walk(PORTS_DIR).filter((f) => f.endsWith('.port.ts'));
    const total = files.reduce(
      (acc, f) => acc + countExportedInterfaces(readFileSync(f, 'utf8')),
      0,
    );
    expect(total).toBe(10);
  });

  it('detects a forbidden import via a stubbed file reader', () => {
    const reader = vi.fn(() => "import { x } from '@nestjs/common';");
    const offenders = findForbiddenImports(['virtual.ts'], reader);
    expect(offenders).toEqual(['virtual.ts']);
    expect(reader).toHaveBeenCalled();
  });
});
