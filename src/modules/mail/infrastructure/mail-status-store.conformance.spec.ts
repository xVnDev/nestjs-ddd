/**
 * @file Mail status store conformance spec.
 */

import { vi } from 'vitest';
import { definePortConformance } from '../../shared/testing/conformance.js';
import { MailSendStatus } from '../domain/mail-send-status.js';
import { InMemoryMailStatusStoreAdapter } from './in-memory-mail-status-store.adapter.js';
import { TypeOrmMailStatusStoreAdapter } from './typeorm-mail-status-store.adapter.js';

function createRepo() {
  const rows = new Map<string, { jobId: string; status: MailSendStatus }>();
  return {
    save: vi.fn(async (entity: { jobId: string; status: MailSendStatus }) => {
      rows.set(entity.jobId, { ...entity });
      return entity;
    }),
    findOne: vi.fn(async ({ where }: { where: { jobId: string } }) => {
      return rows.get(where.jobId) ?? null;
    }),
    find: vi.fn(async ({ where }: { where: { status: MailSendStatus } }) => {
      return [...rows.values()].filter((row) => row.status === where.status);
    }),
  };
}

definePortConformance<import('../domain/ports/mail-status-store.port.js').MailStatusStore>('MailStatusStore', [
  { name: 'in-memory', create: () => new InMemoryMailStatusStoreAdapter() },
  { name: 'typeorm (mocked)', create: () => new TypeOrmMailStatusStoreAdapter(createRepo() as never) },
], (getAdapter) => {
  it('stores and retrieves a status', async () => {
    await getAdapter().set('job-1', MailSendStatus.QUEUED);
    expect(await getAdapter().get('job-1')).toBe(MailSendStatus.QUEUED);
  });

  it('lists by status', async () => {
    await getAdapter().set('job-2', MailSendStatus.SENT);
    expect(await getAdapter().listByStatus(MailSendStatus.SENT)).toContain('job-2');
  });
});