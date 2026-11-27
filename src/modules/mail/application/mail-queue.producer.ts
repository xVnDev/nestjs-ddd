/**
 * @file Named mail queue producer.
 */

import { Inject, Injectable } from '@nestjs/common';
import { QUEUE } from '../../shared/ports/tokens.js';
import type { QueuePort } from '../../shared/ports/queue.port.js';
import type { MailMessage } from '../../shared/ports/mail.port.js';

/** Serialisable job consumed by the mail worker. */
export type SendMailJob = {
  /** Unique job id used for status tracking. */
  id: string;
  /** Render-ready mail message. */
  message: MailMessage;
};

@Injectable()
export class MailQueueProducer {
  constructor(@Inject(QUEUE) private readonly queue: QueuePort) {}

  /** Enqueues a mail send job on the named `mail` queue. */
  async enqueueMail(message: MailMessage): Promise<SendMailJob> {
    const job: SendMailJob = { id: crypto.randomUUID(), message };
    await this.queue.enqueue('mail', job);
    return job;
  }
}