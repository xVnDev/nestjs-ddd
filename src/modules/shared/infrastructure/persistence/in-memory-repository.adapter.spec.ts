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
    const saved = (await adapter.save({ name: 'mutable' })) as { id: string; name: string };
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
    const saved = (await adapter.save({ name: 'identified' })) as { id: string };
    expect(idGenerator.next).toHaveBeenCalled();
    expect(saved.id).toBe('generated-id');
  });
});
