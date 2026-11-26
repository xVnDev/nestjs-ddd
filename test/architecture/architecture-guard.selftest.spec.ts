/**
 * @file Self-test proving the architecture guards actually fail on violations.
 */
import { describe, expect, it } from 'vitest';
import {
  checkCommonDomainFree,
  checkDomainPurity,
  checkInwardDependencies,
  scanSource,
} from './lib/import-scanner.js';

describe('architecture guard self-test', () => {
  it('detects a domain file importing @nestjs/common', () => {
    const file = 'src/modules/user/domain/bad.ts';
    const source = "import { Module } from '@nestjs/common';\n";
    const records = scanSource(source, file);
    const violations = checkDomainPurity(records);
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe(file);
    expect(violations[0].line).toBe(1);
  });

  it('detects an application file importing infrastructure', () => {
    const file = 'src/modules/user/application/bad.ts';
    const source = "import { x } from '../infrastructure/foo.js';\n";
    const records = scanSource(source, file);
    const violations = checkInwardDependencies(records);
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe(file);
    expect(violations[0].line).toBe(1);
  });

  it('detects a src/common file importing a context domain', () => {
    const file = 'src/common/bad.ts';
    const source =
      "import { X } from '../modules/user/domain/user.entity.js';\n";
    const records = scanSource(source, file);
    const violations = checkCommonDomainFree(records);
    expect(violations).toHaveLength(1);
    expect(violations[0].file).toBe(file);
    expect(violations[0].line).toBe(1);
  });

  it('reports zero violations for a clean source', () => {
    const file = 'src/modules/user/domain/good.ts';
    const source =
      "import { Entity } from '../../shared/domain/entity.base.js';\n";
    const records = scanSource(source, file);
    const violations = checkDomainPurity(records);
    expect(violations).toHaveLength(0);
  });
});
