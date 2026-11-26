/**
 * @file Shared repository port conformance spec.
 */

import { expect, it } from 'vitest';
import { definePortConformance } from '../../testing/conformance.js';
import { PortAdapterEntry } from '../../testing/conformance.js';
import type { RepositoryPort } from '../../ports/repository.port.js';
import { InMemoryRepositoryAdapter } from './in-memory-repository.adapter.js';

/**
 * Signature of a factory producing a repository adapter.
 *
 * @typeParam T - Entity type.
 */
export type RepositoryConformanceFactory<T = any> = () =>
  RepositoryPort<T> | Promise<RepositoryPort<T>>;

/**
 * Registers the shared repository conformance suite for the given adapters.
 *
 * @typeParam T - Entity type.
 * @param adapters - Adapters to run the suite against.
 */
export function defineRepositoryConformance<T = any>(
  adapters: ReadonlyArray<PortAdapterEntry<RepositoryPort<T>>>,
): void {
  definePortConformance<RepositoryPort<T>>(
    'Repository',
    adapters,
    (getAdapter) => {
      it('saves and finds by id', async () => {
        const adapter = getAdapter() as RepositoryPort<any>;
        const saved = (await adapter.save({ name: 'alpha' })) as { id: string };
        expect(saved.id).toBeDefined();
        const found = (await adapter.findById(saved.id)) as {
          name: string;
        } | null;
        expect(found).not.toBeNull();
        expect(found?.name).toBe('alpha');
      });

      it('findAll returns saved rows', async () => {
        const adapter = getAdapter() as RepositoryPort<any>;
        await adapter.save({ name: 'beta' });
        const all = (await adapter.findAll()) as Array<{ name: string }>;
        expect(all.length).toBeGreaterThan(0);
      });

      it('soft-deleted rows are hidden from findById and findAll', async () => {
        const adapter = getAdapter() as RepositoryPort<any>;
        const saved = (await adapter.save({ name: 'gamma' })) as { id: string };
        await adapter.softDelete(saved.id);
        expect(await adapter.findById(saved.id)).toBeNull();
        const all = (await adapter.findAll()) as Array<{ id: string }>;
        expect(all.some((row) => row.id === saved.id)).toBe(false);
      });

      it('restore makes a soft-deleted row visible again', async () => {
        const adapter = getAdapter() as RepositoryPort<any>;
        const saved = (await adapter.save({ name: 'delta' })) as { id: string };
        await adapter.softDelete(saved.id);
        await adapter.restore(saved.id);
        expect(await adapter.findById(saved.id)).not.toBeNull();
      });

      it('count excludes soft-deleted rows', async () => {
        const adapter = getAdapter() as RepositoryPort<any>;
        const saved = (await adapter.save({ name: 'epsilon' })) as {
          id: string;
        };
        const before = await adapter.count();
        await adapter.softDelete(saved.id);
        const after = await adapter.count();
        expect(after).toBe(before - 1);
      });
    },
  );
}

// Aliases for alternative naming used by callers.
export const defineRepositoryPortConformance = defineRepositoryConformance;
export const runRepositoryConformance = defineRepositoryConformance;
export const repositoryConformanceSpec = defineRepositoryConformance;
export const repositoryConformance = defineRepositoryConformance;

// Wire the suite to the in-memory fallback adapter for unit execution.
defineRepositoryConformance([
  {
    name: 'InMemory',
    create: () => new InMemoryRepositoryAdapter(),
  },
]);
