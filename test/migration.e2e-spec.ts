/**
 * @file E2E test for migration apply and revert.
 */

import { DataSource } from 'typeorm';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { startPostgres } from './support/postgres-container.js';
import { Init1795719746297 } from '../src/migrations/1795719746297-Init.js';

describe('migration (e2e)', () => {
  let container: Awaited<ReturnType<typeof startPostgres>>['container'];
  let dataSource: DataSource;

  beforeAll(async () => {
    const pg = await startPostgres();
    await new Promise((r) => setTimeout(r, 2000));
    container = pg.container;
    dataSource = new DataSource({
      type: 'postgres',
      url: pg.url,
      synchronize: false,
      migrations: [Init1795719746297],
      entities: [],
    });
    await dataSource.initialize();
  }, 60000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (container) await container.stop();
  });

  it('applies the migration and creates the soft-delete table/columns', async () => {
    await dataSource.runMigrations();
    const columns = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'soft_delete_entity'`,
    );
    const names = columns.map((c: { column_name: string }) => c.column_name);
    expect(names).toContain('id');
    expect(names).toContain('deletedAt');
    const indexes = await dataSource.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'soft_delete_entity'`,
    );
    expect(indexes.length).toBeGreaterThan(0);

    // idempotent re-run
    const pending = await dataSource.showMigrations();
    expect(pending).toBe(false);
  });

  it('reverts the migration and removes the table', async () => {
    await dataSource.undoLastMigration();
    const tables = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name = 'soft_delete_entity'`,
    );
    expect(tables.length).toBe(0);
  });
});
