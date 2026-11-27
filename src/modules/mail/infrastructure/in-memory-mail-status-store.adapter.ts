/**
 * @file In-memory mail status store adapter.
 */

import { vi } from 'vitest';
import type { MailSendStatus } from '../domain/mail-send-status.js';
import type { MailStatusStore } from '../domain/ports/mail-status-store.port.js';

export class InMemoryMailStatusStoreAdapter implements MailStatusStore {
  private readonly store = new Map<string, MailSendStatus>();

  public readonly set = vi.fn(async (jobId: string, status: MailSendStatus) => {
    this.store.set(jobId, status);
  });

  public readonly get = vi.fn(async (jobId: string) => {
    return this.store.get(jobId) ?? null;
  });

  public readonly listByStatus = vi.fn(async (status: MailSendStatus) => {
    return [...this.store.entries()]
      .filter(([, value]) => value === status)
      .map(([key]) => key);
  });
}
