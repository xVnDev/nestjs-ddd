/**
 * @file Mail queue producer spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { MailSendStatus } from '../domain/mail-send-status.js';
import { MailQueueProducer } from './mail-queue.producer.js';

describe('MailQueueProducer', () => {
  it('enqueues to the mail queue with a job id', async () => {
    const enqueue = vi.fn(async () => undefined);
    const queue = {
      enqueue,
      registerWorker: vi.fn(),
      close: vi.fn(async () => undefined),
    };
    const producer = new MailQueueProducer(queue as any);
    const job = await producer.enqueueMail({
      to: 'to@example.com',
      subject: 'hi',
    });
    expect(enqueue).toHaveBeenCalledWith(
      'mail',
      expect.objectContaining({
        id: expect.any(String),
        message: expect.any(Object),
      }),
    );
    expect(job.id).toBeTruthy();
  });

  it('writes QUEUED when a status store is provided', async () => {
    const enqueue = vi.fn(async () => undefined);
    const queue = {
      enqueue,
      registerWorker: vi.fn(),
      close: vi.fn(async () => undefined),
    };
    const set = vi.fn(async () => undefined);
    const store = {
      set,
      get: vi.fn(async () => null),
      listByStatus: vi.fn(async () => []),
    };
    const producer = new MailQueueProducer(queue as any, store as any);
    const job = await producer.enqueueMail({
      to: 'to@example.com',
      subject: 'hi',
    });
    expect(set).toHaveBeenCalledWith(job.id, MailSendStatus.QUEUED);
  });

  it('supports a tracker-like status store wrapper', async () => {
    const enqueue = vi.fn(async () => undefined);
    const queue = {
      enqueue,
      registerWorker: vi.fn(),
      close: vi.fn(async () => undefined),
    };
    const set = vi.fn(async () => undefined);
    const store = {
      set,
      get: vi.fn(async () => null),
      listByStatus: vi.fn(async () => []),
    };
    const tracker = { store };
    const producer = new MailQueueProducer(queue as any, tracker as any);
    const job = await producer.enqueueMail({
      to: 'to@example.com',
      subject: 'hi',
    });
    expect(set).toHaveBeenCalledWith(job.id, MailSendStatus.QUEUED);
  });

  it('ignores an invalid status store wrapper', async () => {
    const enqueue = vi.fn(async () => undefined);
    const queue = {
      enqueue,
      registerWorker: vi.fn(),
      close: vi.fn(async () => undefined),
    };
    const producer = new MailQueueProducer(
      queue as any,
      { store: 'invalid' } as any,
    );
    const job = await producer.enqueueMail({
      to: 'to@example.com',
      subject: 'hi',
    });
    expect(job.id).toBeTruthy();
    expect(enqueue).toHaveBeenCalled();
  });
});
