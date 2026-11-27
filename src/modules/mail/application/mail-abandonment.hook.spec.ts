/**
 * @file Mail abandonment hook spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { MailSendStatus } from '../domain/mail-send-status.js';
import { MailAbandonmentHook } from './mail-abandonment.hook.js';

describe('MailAbandonmentHook', () => {
  it('writes ABANDONED once', async () => {
    const set = vi.fn(async () => undefined);
    const store = { set, get: vi.fn(async () => null), listByStatus: vi.fn(async () => []) };
    const hook = new MailAbandonmentHook(store as any);
    await hook.handle({ id: 'job-1', message: { to: 'to@example.com', subject: 'hi' } });
    expect(set).toHaveBeenCalledWith('job-1', MailSendStatus.ABANDONED);
  });
});