/**
 * @file Mail abandonment hook spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { MailSendStatus } from '../domain/mail-send-status.js';
import { MailAbandonmentHook } from './mail-abandonment.hook.js';

describe('MailAbandonmentHook', () => {
  it('writes ABANDONED once', async () => {
    const set = vi.fn(async () => undefined);
    const store = {
      set,
      get: vi.fn(async () => null),
      listByStatus: vi.fn(async () => []),
    };
    const hook = new MailAbandonmentHook(store as any);
    await hook.handle({
      id: 'job-1',
      message: { to: 'to@example.com', subject: 'hi' },
    });
    expect(set).toHaveBeenCalledWith('job-1', MailSendStatus.ABANDONED);
  });

  it('registers an abandonment handler when queue supports it', async () => {
    const set = vi.fn(async () => undefined);
    const store = {
      set,
      get: vi.fn(async () => null),
      listByStatus: vi.fn(async () => []),
    };
    const registerAbandonmentHandler = vi.fn(
      (name: string, cb: (payload: unknown) => void) => {
        cb({ id: 'job-1', message: {} });
      },
    );
    const queue = { registerAbandonmentHandler };
    const hook = new MailAbandonmentHook(store as any, queue as any);
    hook.onModuleInit();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(registerAbandonmentHandler).toHaveBeenCalledWith(
      'mail',
      expect.any(Function),
    );
    expect(set).toHaveBeenCalledWith('job-1', MailSendStatus.ABANDONED);
  });

  it('does nothing when queue is missing', () => {
    const set = vi.fn(async () => undefined);
    const store = {
      set,
      get: vi.fn(async () => null),
      listByStatus: vi.fn(async () => []),
    };
    const hook = new MailAbandonmentHook(store as any);
    expect(() => hook.onModuleInit()).not.toThrow();
  });

  it('does nothing when job has no id', async () => {
    const set = vi.fn(async () => undefined);
    const store = {
      set,
      get: vi.fn(async () => null),
      listByStatus: vi.fn(async () => []),
    };
    const hook = new MailAbandonmentHook(store as any);
    await hook.handle({ message: {} });
    await hook.handle(null);
    expect(set).not.toHaveBeenCalled();
  });
});
