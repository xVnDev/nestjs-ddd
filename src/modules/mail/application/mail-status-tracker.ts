/**
 * @file Mail status tracker.
 */

import { Inject, Injectable } from '@nestjs/common';
import { MAIL_STATUS_STORE } from '../../shared/ports/tokens.js';
import type { MailStatusStore } from '../domain/ports/mail-status-store.port.js';
import { MailSendStatus, canTransition } from '../domain/mail-send-status.js';

@Injectable()
export class MailStatusTracker {
  constructor(
    @Inject(MAIL_STATUS_STORE) private readonly store: MailStatusStore,
  ) {}

  async markQueued(jobId: string): Promise<void> {
    await this.store.set(jobId, MailSendStatus.QUEUED);
  }

  async markProcessing(jobId: string): Promise<void> {
    const current = await this.store.get(jobId);
    const from = current ?? MailSendStatus.QUEUED;
    if (!canTransition(from, MailSendStatus.PROCESSING)) {
      throw new Error(
        `Illegal transition ${from} -> ${MailSendStatus.PROCESSING}`,
      );
    }
    await this.store.set(jobId, MailSendStatus.PROCESSING);
  }

  async markSent(jobId: string): Promise<void> {
    const current = await this.store.get(jobId);
    const from = current ?? MailSendStatus.PROCESSING;
    if (!canTransition(from, MailSendStatus.SENT)) {
      throw new Error(`Illegal transition ${from} -> ${MailSendStatus.SENT}`);
    }
    await this.store.set(jobId, MailSendStatus.SENT);
  }

  async markFailed(jobId: string): Promise<void> {
    const current = await this.store.get(jobId);
    const from = current ?? MailSendStatus.PROCESSING;
    if (!canTransition(from, MailSendStatus.FAILED)) {
      throw new Error(`Illegal transition ${from} -> ${MailSendStatus.FAILED}`);
    }
    await this.store.set(jobId, MailSendStatus.FAILED);
  }

  async markAbandoned(jobId: string): Promise<void> {
    await this.store.set(jobId, MailSendStatus.ABANDONED);
  }
}
