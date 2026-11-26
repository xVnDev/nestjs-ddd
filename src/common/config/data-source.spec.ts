/**
 * @file Unit tests for the CLI data source.
 */

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('./database.config.js', () => ({
  databaseConfig: vi.fn(() => ({
    url: 'postgres://localhost:5432/test',
    ssl: false,
    poolSize: 3,
    logging: false,
    synchronize: false,
  })),
}));

describe('data source', () => {
  it('builds options from the shared config', async () => {
    const { dataSource } = await import('./data-source.js');
    expect(dataSource.options).toMatchObject({
      type: 'postgres',
      url: 'postgres://localhost:5432/test',
      synchronize: false,
    });
  });

  it('defines all migration scripts', () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts.typeorm).toBeDefined();
    expect(pkg.scripts['migration:generate']).toBeDefined();
    expect(pkg.scripts['migration:run']).toBeDefined();
    expect(pkg.scripts['migration:revert']).toBeDefined();
  });
});
