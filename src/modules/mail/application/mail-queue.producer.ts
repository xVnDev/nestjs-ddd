/**
 * @file Named mail queue producer.
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import { MAIL_STATUS_STORE, QUEUE } from '../../shared/ports/tokens.js';
import type { QueuePort } from '../../shared/ports/queue.port.js';
import type { MailMessage } from '../../shared/ports/mail.port.js';
import { MailSendStatus } from '../domain/mail-send-status.js';

/** Serialisable job consumed by the mail worker. */
export type SendMailJob = {
  /** Unique job id used for status tracking. */
  id: string;
  /** Render-ready mail message. */
  message: MailMessage;
};

function isStatusStore(
  value: unknown,
): value is { set: (id: string, status: MailSendStatus) => any } {
  return !!value && typeof (value as { set?: unknown }).set === 'function';
}

@Injectable()
export class MailQueueProducer {
  private readonly statusStore?: {
    set: (id: string, status: MailSendStatus) => any;
  };

  constructor(
    @Inject(QUEUE) private readonly queue: QueuePort,
    @Inject(MAIL_STATUS_STORE) @Optional() statusStoreOrTracker?: unknown,
  ) {
    if (isStatusStore(statusStoreOrTracker)) {
      this.statusStore = statusStoreOrTracker as {
        set: (id: string, status: MailSendStatus) => any;
      };
    } else if (
      statusStoreOrTracker &&
      typeof (statusStoreOrTracker as { store?: unknown }).store !== 'undefined'
    ) {
      const store = (
        statusStoreOrTracker as {
          store: { set: (id: string, status: MailSendStatus) => any };
        }
      ).store;
      if (isStatusStore(store)) this.statusStore = store;
    }
  }

  /** Enqueues a mail send job on the named `mail` queue. */
  async enqueueMail(message: MailMessage): Promise<SendMailJob> {
    const job: SendMailJob = { id: crypto.randomUUID(), message };
    if (this.statusStore) {
      await this.statusStore.set(job.id, MailSendStatus.QUEUED);
    }
    await this.queue.enqueue('mail', job);
    return job;
  }
}
