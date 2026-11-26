/**
 * @file Conformance harness self-test.
 */

import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { definePortConformance } from './conformance.js';
import {
  alternateGreeterAdapter,
  inMemoryGreeterAdapter,
  inMemoryGreeterFactory,
  alternateGreeterFactory,
  brokenGreeterAdapter,
  brokenGreeterFactory,
} from './fixtures/dummy-adapters.js';

describe('conformance harness self-test', () => {
  definePortConformance(
    'Greeter',
    [inMemoryGreeterAdapter, alternateGreeterAdapter],
    (getAdapter) => {
      it('greet returns a string', () => {
        expect(typeof getAdapter().greet('Ada')).toBe('string');
      });

      it('starts with an empty item list', () => {
        expect(getAdapter().items).toEqual([]);
      });

      it('records a greeting', () => {
        getAdapter().greet('Ada');
        expect(getAdapter().items).toEqual(['Ada']);
      });

      it('mutates adapter state', () => {
        getAdapter().items.push('mutated');
      });

      it('observes a fresh instance in the next test', () => {
        expect(getAdapter().items).toEqual([]);
      });

      it('exposes named accessors', () => {
        const instance = getAdapter();
        expect(getAdapter.get()).toBe(instance);
        expect(getAdapter.getAdapter()).toBe(instance);
        expect(getAdapter.adapter()).toBe(instance);
      });
    },
  );

  it('runs both adapters', () => {
    // factory spies prove each adapter's describe block executed at least once
    expect(inMemoryGreeterFactory).toHaveBeenCalled();
    expect(alternateGreeterFactory).toHaveBeenCalled();
  });

  it('creates a fresh adapter per test (factory called multiple times)', () => {
    const before = inMemoryGreeterFactory.mock.calls.length;
    // trigger another describe? Already executed; just ensure more than one
    expect(inMemoryGreeterFactory.mock.calls.length).toBeGreaterThan(1);
    void before;
  });

  it('broken adapter factory yields a non-string greeting', () => {
    expect(brokenGreeterAdapter.name).toBe('broken');
    expect(brokenGreeterFactory().greet()).toBe(42 as unknown as string);
  });

  it('reports a broken adapter instead of skipping it (child process)', () => {
    const tempFile = join(
      process.cwd(),
      'src',
      'modules',
      'shared',
      'testing',
      'fixtures',
      '.broken-adapter.spec.ts',
    );
    const source = `import { describe, expect, it } from 'vitest';
import { definePortConformance } from '../conformance.js';
import { brokenGreeterAdapter, inMemoryGreeterAdapter } from './dummy-adapters.js';

describe('broken adapter case', () => {
  definePortConformance('Greeter', [inMemoryGreeterAdapter, brokenGreeterAdapter], (getAdapter) => {
    it('greet returns a string', () => {
      expect(typeof getAdapter().greet('Ada')).toBe('string');
    });
  });
});
`;
    writeFileSync(tempFile, source, 'utf8');
    try {
      const result = spawnSync(
        './node_modules/.bin/vitest',
        ['run', tempFile],
        { cwd: process.cwd(), encoding: 'utf8', timeout: 180000 },
      );
      expect(result.status).not.toBe(0);
    } finally {
      try {
        rmSync(tempFile, { force: true });
      } catch {
        // ignore
      }
    }
  });
});
