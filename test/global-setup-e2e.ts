import { DataSource } from 'typeorm';
import { Init1795719746297 } from '../src/migrations/1795719746297-Init.js';
import { AddUsersTable1795719746298 } from '../src/modules/user/infrastructure/persistence/migrations/1795719746298-AddUsersTable.js';

export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  const dataSource = new DataSource({
    type: 'postgres',
    url,
    ssl: process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1',
    synchronize: false,
    migrations: [Init1795719746297, AddUsersTable1795719746298],
  });

  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.query('TRUNCATE TABLE "users", "soft_delete_entity" CASCADE');
  await dataSource.destroy();
}
