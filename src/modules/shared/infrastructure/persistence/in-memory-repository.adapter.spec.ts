/* oxlint-disable typescript/unbound-method */
/**
 * @file Unit tests for the in-memory repository adapter.
 */

import { describe, expect, it, vi } from 'vitest';
import { Clock } from '../../ports/clock.port.js';
import { IdGenerator } from '../../ports/id-generator.port.js';
import { InMemoryRepositoryAdapter } from './in-memory-repository.adapter.js';

// Reuse the shared conformance suite verbatim.
import './repository.conformance.spec.js';

describe('InMemoryRepositoryAdapter', () => {
  it('deep-copies stored rows', async () => {
    const adapter = new InMemoryRepositoryAdapter();
    const saved = (await adapter.save({ name: 'mutable' })) as {
      id: string;
      name: string;
    };
    const found = (await adapter.findById(saved.id)) as { name: string };
    found.name = 'changed';
    const again = (await adapter.findById(saved.id)) as { name: string };
    expect(again.name).toBe('mutable');
  });

  it('uses the CLOCK port for timestamps', async () => {
    const fixed = new Date('2026-02-02T00:00:00.000Z');
    const clock: Clock = { now: vi.fn(() => fixed) };
    const adapter = new InMemoryRepositoryAdapter(undefined, clock);
    const saved = (await adapter.save({ name: 'clocked' })) as {
      id: string;
      createdAt: Date;
      updatedAt: Date;
    };
    expect(clock.now).toHaveBeenCalled();
    expect(new Date(saved.createdAt).getTime()).toBe(fixed.getTime());
  });

  it('uses the ID_GENERATOR port for ids', async () => {
    const idGenerator: IdGenerator = { next: vi.fn(() => 'generated-id') };
    const adapter = new InMemoryRepositoryAdapter(idGenerator);
    const saved = (await adapter.save({ name: 'identified' })) as {
      id: string;
    };
    expect(idGenerator.next).toHaveBeenCalled();
    expect(saved.id).toBe('generated-id');
  });

  it('deep-copies nested arrays', async () => {
    const adapter = new InMemoryRepositoryAdapter();
    const saved = (await adapter.save({ name: 'arr', tags: ['a', 'b'] })) as {
      id: string;
      tags: string[];
    };
    const found = (await adapter.findById(saved.id)) as { tags: string[] };
    found.tags.push('c');
    found.tags[0] = 'z';
    const again = (await adapter.findById(saved.id)) as { tags: string[] };
    expect(again.tags).toEqual(['a', 'b']);
  });

  it('softDelete on a missing id is a no-op', async () => {
    const adapter = new InMemoryRepositoryAdapter();
    await expect(adapter.softDelete('missing')).resolves.toBeUndefined();
    expect(await adapter.count()).toBe(0);
  });

  it('restore on a missing id is a no-op', async () => {
    const adapter = new InMemoryRepositoryAdapter();
    await expect(adapter.restore('missing')).resolves.toBeUndefined();
  });

  it('preserves createdAt when explicitly provided', async () => {
    const fixed = new Date('2026-01-01T00:00:00.000Z');
    const adapter = new InMemoryRepositoryAdapter();
    const saved = (await adapter.save({
      name: 'with-date',
      createdAt: fixed,
    })) as {
      createdAt: Date;
    };
    expect(new Date(saved.createdAt).getTime()).toBe(fixed.getTime());
  });

  it('preserves createdAt across updates of an existing row', async () => {
    const adapter = new InMemoryRepositoryAdapter();
    const first = (await adapter.save({ name: 'first' })) as {
      id: string;
      createdAt: Date;
    };
    const second = (await adapter.save({ id: first.id, name: 'second' })) as {
      id: string;
      name: string;
      createdAt: Date;
    };
    expect(second.id).toBe(first.id);
    expect(second.name).toBe('second');
    expect(new Date(second.createdAt).getTime()).toBe(
      new Date(first.createdAt).getTime(),
    );
  });

  it('keeps an explicitly provided deletedAt value', async () => {
    const when = new Date('2026-03-03T00:00:00.000Z');
    const adapter = new InMemoryRepositoryAdapter();
    const saved = (await adapter.save({
      name: 'deleted',
      deletedAt: when,
    })) as {
      deletedAt: Date;
    };
    expect(new Date(saved.deletedAt).getTime()).toBe(when.getTime());
  });
});
