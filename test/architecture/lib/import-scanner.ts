/**
 * @file Pure import scanner used by the architecture guards.
 *
 * Exposes {@link scanSource} which parses a TypeScript source string with the
 * compiler API and returns every import/export/module specifier together with
 * its file path and 1-based line number. The guard predicates in this module
 * build on top of those records so the same logic can be exercised against
 * in-memory strings in the self-test.
 */
import * as path from 'node:path';
import ts from 'typescript';

/**
 * A single import/export record extracted from a source file.
 */
export interface ImportRecord {
  /** File path as passed to {@link scanSource}. */
  file: string;
  /** 1-based line number of the import declaration. */
  line: number;
  /** Module specifier text. */
  specifier: string;
  /** Whether the import is type-only. */
  isTypeOnly: boolean;
}

/**
 * A reported architecture violation.
 */
export interface Violation {
  file: string;
  line: number;
  specifier: string;
  reason?: string;
}

const LAYERS = [
  'domain',
  'application',
  'infrastructure',
  'interfaces',
] as const;
type Layer = (typeof LAYERS)[number];

/**
 * Converts a path to a posix-style absolute path.
 *
 * @param p - Path to normalize.
 * @returns Absolute posix path.
 */
function toAbs(p: string): string {
  const resolved = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  return resolved.replace(/\\/g, '/');
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
 * Returns whether a static import declaration is type-only.
 *
 * @param node - Import declaration node.
 * @returns True when type-only.
 */
function staticImportIsTypeOnly(node: ts.ImportDeclaration): boolean {
  if (node.importClause?.isTypeOnly === true) return true;
  const clause = node.importClause;
  if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    const elements = clause.namedBindings.elements;
    if (elements.length > 0 && elements.every((el) => el.isTypeOnly)) {
      return true;
    }
  }
  return false;
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
 * Returns whether an export declaration is type-only.
 *
 * @param node - Export declaration node.
 * @returns True when type-only.
 */
function exportIsTypeOnly(node: ts.ExportDeclaration): boolean {
  return node.isTypeOnly === true;
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
 * Returns whether an import-equals declaration is type-only.
 *
 * @param node - Import-equals declaration node.
 * @returns True when type-only.
 */
function importEqualsIsTypeOnly(node: ts.ImportEqualsDeclaration): boolean {
  return node.modifiers?.some((m) => m.getText() === 'type') ?? false;
}

/**
 * Parses a source string and returns every import/export record.
 *
 * @param source - TypeScript source text.
 * @param file - File path associated with the source.
 * @returns Import records with file, line, specifier and type-only flag.
 */
export function scanSource(source: string, file: string): ImportRecord[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const records: ImportRecord[] = [];

  const visit = (node: ts.Node): void => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

    if (ts.isImportDeclaration(node)) {
      const spec = staticImportSpecifier(node);
      if (spec !== undefined) {
        records.push({
          file,
          line,
          specifier: spec,
          isTypeOnly: staticImportIsTypeOnly(node),
        });
      }
    } else if (ts.isExportDeclaration(node)) {
      const spec = exportDeclarationSpecifier(node);
      if (spec !== undefined) {
        records.push({
          file,
          line,
          specifier: spec,
          isTypeOnly: exportIsTypeOnly(node),
        });
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const spec = dynamicImportSpecifier(node);
      if (spec !== undefined) {
        records.push({ file, line, specifier: spec, isTypeOnly: false });
      }
    } else if (ts.isImportTypeNode(node)) {
      const spec = importTypeSpecifier(node);
      if (spec !== undefined) {
        records.push({ file, line, specifier: spec, isTypeOnly: true });
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      const spec = importEqualsSpecifier(node);
      if (spec !== undefined) {
        records.push({
          file,
          line,
          specifier: spec,
          isTypeOnly: importEqualsIsTypeOnly(node),
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return records;
}

/**
 * Resolves a specifier against a file path.
 *
 * @param specifier - Module specifier.
 * @param file - Source file path.
 * @returns Resolved absolute posix path (or original specifier for packages).
 */
export function resolveSpecifier(specifier: string, file: string): string {
  const base = toAbs(file);
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    return path.posix.normalize(
      path.posix.join(path.posix.dirname(base), specifier),
    );
  }
  return specifier;
}

/**
 * Returns the context name for a file path, if any.
 *
 * @param file - File path.
 * @returns Context name or null.
 */
export function contextOf(file: string): string | null {
  const abs = toAbs(file);
  const m = abs.match(/\/modules\/([^/]+)\//);
  return m ? m[1] : null;
}

/**
 * Returns the layer name for a file path, if any.
 *
 * @param file - File path.
 * @returns Layer name or null.
 */
export function layerOf(file: string): Layer | null {
  const abs = toAbs(file);
  const m = abs.match(/\/modules\/[^/]+\/([^/]+)\//);
  if (!m) return null;
  const candidate = m[1] as Layer;
  return (LAYERS as readonly string[]).includes(candidate) ? candidate : null;
}

/**
 * Forbidden namespaces/paths for domain purity.
 */
const FORBIDDEN_DOMAIN_NAMESPACES = [
  '@nestjs/',
  'typeorm',
  'redis',
  'ioredis',
  'bullmq',
  'express',
  'class-validator',
  'class-transformer',
];

/**
 * Determines whether a specifier is forbidden inside a domain file.
 *
 * @param specifier - Module specifier.
 * @returns True when forbidden.
 */
export function isForbiddenDomainImport(specifier: string): boolean {
  for (const ns of FORBIDDEN_DOMAIN_NAMESPACES) {
    if (ns.endsWith('/')) {
      if (specifier.startsWith(ns)) return true;
    } else {
      if (specifier === ns || specifier.startsWith(`${ns}/`)) return true;
    }
  }
  if (/\/infrastructure(\/|$)/.test(specifier)) return true;
  if (/\/interfaces(\/|$)/.test(specifier)) return true;
  return false;
}

/**
 * Checks domain purity for a set of records.
 *
 * @param records - Import records (expected from domain files).
 * @returns Violations.
 */
export function checkDomainPurity(records: ImportRecord[]): Violation[] {
  const out: Violation[] = [];
  for (const r of records) {
    if (isForbiddenDomainImport(r.specifier)) {
      out.push({
        file: r.file,
        line: r.line,
        specifier: r.specifier,
        reason: 'forbidden domain import',
      });
    }
  }
  return out;
}

/**
 * Determines whether an import record resolves into a context domain folder.
 *
 * @param record - Import record.
 * @returns True when the resolved path is under a domain folder.
 */
export function resolvesToDomain(record: ImportRecord): boolean {
  const resolved = resolveSpecifier(record.specifier, record.file);
  return /\/modules\/[^/]+\/domain(\/|$)/.test(resolved);
}

/**
 * Determines whether a record is an allowed type-only import of the shared domain barrel.
 *
 * @param record - Import record.
 * @returns True when allowed.
 */
export function isAllowedSharedDomainTypeOnly(record: ImportRecord): boolean {
  if (!record.isTypeOnly) return false;
  const resolved = resolveSpecifier(record.specifier, record.file);
  return /\/modules\/shared\/domain(\/|$)/.test(resolved);
}

/**
 * Checks that src/common files do not import domain code at runtime.
 *
 * @param records - Import records (expected from common files).
 * @returns Violations.
 */
export function checkCommonDomainFree(records: ImportRecord[]): Violation[] {
  const out: Violation[] = [];
  for (const r of records) {
    if (!resolvesToDomain(r)) continue;
    if (isAllowedSharedDomainTypeOnly(r)) continue;
    out.push({
      file: r.file,
      line: r.line,
      specifier: r.specifier,
      reason: 'common imports domain',
    });
  }
  return out;
}

/**
 * Checks inward-only dependencies for a set of records.
 *
 * @param records - Import records.
 * @returns Violations.
 */
export function checkInwardDependencies(records: ImportRecord[]): Violation[] {
  const out: Violation[] = [];
  for (const r of records) {
    const layer = layerOf(r.file);
    if (!layer) continue;
    const ctx = contextOf(r.file);
    const resolved = resolveSpecifier(r.specifier, r.file);

    if (layer === 'domain') {
      if (r.specifier.startsWith('.') || r.specifier.startsWith('/')) {
        const sameContextDomain =
          ctx !== null && resolved.includes(`/modules/${ctx}/domain/`);
        const sharedDomain = resolved.includes('/modules/shared/domain/');
        if (!sameContextDomain && !sharedDomain) {
          out.push({
            file: r.file,
            line: r.line,
            specifier: r.specifier,
            reason: 'domain imports non-domain',
          });
        }
      }
      continue;
    }

    if (layer === 'application') {
      if (r.specifier.startsWith('.') || r.specifier.startsWith('/')) {
        if (
          /\/infrastructure(\/|$)/.test(resolved) ||
          /\/interfaces(\/|$)/.test(resolved)
        ) {
          out.push({
            file: r.file,
            line: r.line,
            specifier: r.specifier,
            reason: 'application imports infrastructure/interfaces',
          });
        }
      }
      continue;
    }

    // infrastructure and interfaces may import inward; no additional rule here.
  }
  return out;
}
