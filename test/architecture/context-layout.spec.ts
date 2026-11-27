/**
 * @file Architecture guard: bounded-context layer folders + domain-free common.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { checkCommonDomainFree, scanSource } from './lib/import-scanner.js';

const MODULES_DIR = join(process.cwd(), 'src', 'modules');
const COMMON_DIR = join(process.cwd(), 'src', 'common');

const CONTEXTS = ['user', 'auth', 'mail', 'security', 'alerts'];
const LAYERS = ['domain', 'application', 'infrastructure', 'interfaces'];

/**
 * Recursively collects files under a directory.
 *
 * @param dir - Directory to walk.
 * @returns Absolute file paths.
 */
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

/**
 * Lists immediate subdirectory names of a directory.
 *
 * @param dir - Directory to inspect.
 * @returns Subdirectory names.
 */
function subDirs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/**
 * Returns the module specifier of a static import declaration, if any.
 *
 * @param node - Node to inspect.
 * @returns Module specifier or undefined.
 */
function staticImportSpecifier(node: ts.Node): string | undefined {
  if (!ts.isImportDeclaration(node)) return undefined;
  if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
    return undefined;
  }
  return node.moduleSpecifier.text;
}

/**
 * Returns the module specifier of an export declaration, if any.
 *
 * @param node - Node to inspect.
 * @returns Module specifier or undefined.
 */
function exportDeclarationSpecifier(node: ts.Node): string | undefined {
  if (!ts.isExportDeclaration(node)) return undefined;
  if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
    return undefined;
  }
  return node.moduleSpecifier.text;
}

/**
 * Returns the module specifier of a dynamic import call, if any.
 *
 * @param node - Node to inspect.
 * @returns Module specifier or undefined.
 */
function dynamicImportSpecifier(node: ts.Node): string | undefined {
  if (!ts.isCallExpression(node)) return undefined;
  if (node.expression.kind !== ts.SyntaxKind.ImportKeyword) return undefined;
  if (node.arguments.length === 0) return undefined;
  const first = node.arguments[0];
  if (!ts.isStringLiteral(first)) return undefined;
  return first.text;
}

/**
 * Returns the module specifier of a type-only import expression, if any.
 *
 * @param node - Node to inspect.
 * @returns Module specifier or undefined.
 */
function importTypeSpecifier(node: ts.Node): string | undefined {
  if (!ts.isImportTypeNode(node)) return undefined;
  const argument = node.argument;
  if (!ts.isLiteralTypeNode(argument)) return undefined;
  if (!ts.isStringLiteral(argument.literal)) return undefined;
  return argument.literal.text;
}

/**
 * Returns the module specifier of an import-equals declaration, if any.
 *
 * @param node - Node to inspect.
 * @returns Module specifier or undefined.
 */
function importEqualsSpecifier(node: ts.Node): string | undefined {
  if (!ts.isImportEqualsDeclaration(node)) return undefined;
  const reference = node.moduleReference;
  if (!ts.isExternalModuleReference(reference)) return undefined;
  if (!ts.isStringLiteral(reference.expression)) return undefined;
  return reference.expression.text;
}

/**
 * Returns a module specifier for any supported import/export form.
 *
 * @param node - Node to inspect.
 * @returns Module specifier or undefined.
 */
function moduleSpecifierOf(node: ts.Node): string | undefined {
  return (
    staticImportSpecifier(node) ??
    exportDeclarationSpecifier(node) ??
    dynamicImportSpecifier(node) ??
    importTypeSpecifier(node) ??
    importEqualsSpecifier(node)
  );
}

/**
 * Collects module specifiers from import declarations in a source string.
 *
 * @param source - TypeScript source text.
 * @returns Import module specifiers.
 */
export function collectImportSpecifiers(source: string): string[] {
  const sf = ts.createSourceFile(
    'virtual.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const specs: string[] = [];
  const visit = (node: ts.Node): void => {
    const spec = moduleSpecifierOf(node);
    if (spec !== undefined) specs.push(spec);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return specs;
}

/**
 * Whether an import specifier references a context domain folder.
 *
 * @param specifier - Import module specifier.
 * @returns True when the specifier references a domain folder.
 */
export function isDomainImport(specifier: string): boolean {
  return /\/domain(\/|$)/.test(specifier);
}

/**
 * Checks a set of files for domain imports using the provided reader.
 *
 * @param files - File paths to check.
 * @param reader - Function reading file contents.
 * @returns Offending file paths.
 */
export function findCommonDomainImports(
  files: string[],
  reader: (path: string) => string,
): string[] {
  const offenders: string[] = [];
  for (const f of files) {
    const content = reader(f);
    const specs = collectImportSpecifiers(content);
    if (specs.some(isDomainImport)) offenders.push(f);
  }
  return offenders;
}

describe('context layout', () => {
  it('every non-shared context exposes at least the four layer folders', () => {
    const allowed = [...LAYERS, 'adapters', 'i18n'];
    for (const ctx of CONTEXTS) {
      const ctxDir = join(MODULES_DIR, ctx);
      const present = subDirs(ctxDir).sort();
      for (const layer of LAYERS) {
        expect(present).toContain(layer);
      }
      for (const dir of present) {
        expect(allowed).toContain(dir);
      }
    }
  });

  it('src/common is domain-free (no context domain imports)', () => {
    const files = walk(COMMON_DIR).filter(
      (f) =>
        f.endsWith('.ts') &&
        !f.endsWith('.spec.ts') &&
        !f.endsWith('.e2e-spec.ts'),
    );
    const records = files.flatMap((f) =>
      scanSource(readFileSync(f, 'utf8'), f),
    );
    const offenders = checkCommonDomainFree(records).map((v) => v.file);
    expect(offenders).toEqual([]);
  });

  it('detects a common -> domain import via a stubbed file reader', () => {
    const reader = vi.fn(
      () => "import { X } from '../modules/user/domain/user.entity.js';",
    );
    const offenders = findCommonDomainImports(['virtual.ts'], reader);
    expect(offenders).toEqual(['virtual.ts']);
    expect(reader).toHaveBeenCalled();
  });

  it('detects a type-only import from a context domain', () => {
    const reader = vi.fn(
      () => "import type { X } from '../modules/user/domain/user.entity.js';",
    );
    const offenders = findCommonDomainImports(['virtual.ts'], reader);
    expect(offenders).toEqual(['virtual.ts']);
  });

  it('detects a type import expression from a context domain', () => {
    const reader = vi.fn(
      () => "type X = import('../modules/user/domain/user.entity.js').User;",
    );
    const offenders = findCommonDomainImports(['virtual.ts'], reader);
    expect(offenders).toEqual(['virtual.ts']);
  });
});
