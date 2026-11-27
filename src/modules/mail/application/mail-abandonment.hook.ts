/**
 * @file Mail abandonment hook.
 */

import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { MAIL_STATUS_STORE, QUEUE } from '../../shared/ports/tokens.js';
import type { QueuePort } from '../../shared/ports/queue.port.js';
import type { MailStatusStore } from '../domain/ports/mail-status-store.port.js';
import { MailSendStatus } from '../domain/mail-send-status.js';
import type { SendMailJob } from './mail-queue.producer.js';

@Injectable()
export class MailAbandonmentHook implements OnModuleInit {
  constructor(
    @Inject(MAIL_STATUS_STORE) private readonly store: MailStatusStore,
    @Inject(QUEUE) @Optional() private readonly queue?: QueuePort,
  ) {}

  onModuleInit(): void {
    if (
      this.queue &&
      typeof this.queue.registerAbandonmentHandler === 'function'
    ) {
      this.queue.registerAbandonmentHandler('mail', (payload: unknown) => {
        void this.handle(payload);
      });
    }
  }

  async handle(payload: unknown): Promise<void> {
    const job = payload as SendMailJob;
    if (job?.id) {
      await this.store.set(job.id, MailSendStatus.ABANDONED);
    }
  }
}
