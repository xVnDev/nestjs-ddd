/**
 * @file Testcontainers Postgres helper for E2E specs.
 */

import { GenericContainer, Wait } from 'testcontainers';

export interface PostgresContainerHandle {
  container: Awaited<ReturnType<GenericContainer['start']>>;
  url: string;
}

/**
 * Starts a Postgres container and returns its connection URL.
 *
 * @returns A handle with the container and connection URL.
 */
export async function startPostgres(): Promise<PostgresContainerHandle> {
  const container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'nestjs_ddd',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage('database system is ready to accept connections'),
    )
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const url = `postgres://postgres:postgres@${host}:${port}/nestjs_ddd`;
  return { container, url };
}
