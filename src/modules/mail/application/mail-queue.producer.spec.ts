/**
 * @file Mail queue producer spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { MailQueueProducer } from './mail-queue.producer.js';

describe('MailQueueProducer', () => {
  it('enqueues to the mail queue with a job id', async () => {
    const enqueue = vi.fn(async () => undefined);
    const queue = { enqueue, registerWorker: vi.fn(), close: vi.fn(async () => undefined) };
    const producer = new MailQueueProducer(queue as any);
    const job = await producer.enqueueMail({ to: 'to@example.com', subject: 'hi' });
    expect(enqueue).toHaveBeenCalledWith('mail', expect.objectContaining({ id: expect.any(String), message: expect.any(Object) }));
    expect(job.id).toBeTruthy();
  });
});