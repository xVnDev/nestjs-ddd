/**
 * @file In-memory mail status store adapter spec.
 */

import { describe, expect, it } from 'vitest';
import { MailSendStatus } from '../domain/mail-send-status.js';
import { InMemoryMailStatusStoreAdapter } from './in-memory-mail-status-store.adapter.js';

describe('InMemoryMailStatusStoreAdapter', () => {
  it('sets, gets and lists by status', async () => {
    const adapter = new InMemoryMailStatusStoreAdapter();
    await adapter.set('job-1', MailSendStatus.QUEUED);
    expect(await adapter.get('job-1')).toBe(MailSendStatus.QUEUED);
    expect(await adapter.listByStatus(MailSendStatus.QUEUED)).toEqual(['job-1']);
  });
});