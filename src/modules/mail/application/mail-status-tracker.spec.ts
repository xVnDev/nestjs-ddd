/**
 * @file Mail status tracker spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { MailSendStatus } from '../domain/mail-send-status.js';
import { MailStatusTracker } from './mail-status-tracker.js';

describe('MailStatusTracker', () => {
  it('records transition sequences', async () => {
    const storeMap = new Map<string, MailSendStatus>();
    const set = vi.fn(async (jobId: string, status: MailSendStatus) => {
      storeMap.set(jobId, status);
    });
    const get = vi.fn(async (jobId: string) => storeMap.get(jobId) ?? null);
    const store = { set, get, listByStatus: vi.fn(async () => []) };
    const tracker = new MailStatusTracker(store as any);
    await tracker.markQueued('job-1');
    await tracker.markProcessing('job-1');
    await tracker.markSent('job-1');
    expect(set).toHaveBeenCalled();
    expect(storeMap.get('job-1')).toBe(MailSendStatus.SENT);
  });
});