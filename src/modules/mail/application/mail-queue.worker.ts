/**
 * @file Mail queue worker.
 */

import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { MAIL, MAIL_STATUS_STORE, QUEUE } from '../../shared/ports/tokens.js';
import type { QueuePort, QueueHandler } from '../../shared/ports/queue.port.js';
import type { MailPort } from '../../shared/ports/mail.port.js';
import type { SendMailJob } from './mail-queue.producer.js';
import { MailTemplateRenderService } from './mail-template-render.service.js';
import { MailSendStatus } from '../domain/mail-send-status.js';

function isRenderer(value: unknown): value is { render: (...args: any[]) => any } {
  return !!value && typeof (value as { render?: unknown }).render === 'function';
}

function isStatusStore(value: unknown): value is { set: (...args: any[]) => any; get?: (...args: any[]) => any } {
  return !!value && typeof (value as { set?: unknown }).set === 'function' && !isRenderer(value);
}

@Injectable()
export class MailQueueWorker implements OnModuleInit {
  private readonly renderer?: MailTemplateRenderService;
  private readonly statusStore?: { set: (id: string, status: MailSendStatus) => any; get?: (id: string) => any };

  constructor(
    @Inject(QUEUE) private readonly queue: QueuePort,
    @Inject(MAIL) private readonly mail: MailPort,
    @Optional() rendererOrStore?: unknown,
    @Inject(MAIL_STATUS_STORE) @Optional() statusStoreOrTracker?: unknown,
  ) {
    // Allow callers to pass the status store in the renderer slot.
    if (isRenderer(rendererOrStore)) {
      this.renderer = rendererOrStore as MailTemplateRenderService;
    } else if (isStatusStore(rendererOrStore)) {
      this.statusStore = rendererOrStore as { set: (id: string, status: MailSendStatus) => any; get?: (id: string) => any };
    }

    if (isStatusStore(statusStoreOrTracker)) {
      this.statusStore = statusStoreOrTracker as { set: (id: string, status: MailSendStatus) => any; get?: (id: string) => any };
    } else if (statusStoreOrTracker && typeof (statusStoreOrTracker as { store?: unknown }).store !== 'undefined') {
      const store = (statusStoreOrTracker as { store: unknown }).store;
      if (isStatusStore(store)) {
        this.statusStore = store as { set: (id: string, status: MailSendStatus) => any; get?: (id: string) => any };
      }
    }
  }

  onModuleInit(): void {
    const handler: QueueHandler = async (payload: unknown) => {
      const job = payload as SendMailJob;
      const locale = job.message.locale ?? 'en';

      if (this.statusStore) {
        await this.statusStore.set(job.id, MailSendStatus.PROCESSING);
      }

      const template = job.message.template ?? job.message.templateKey;
      if (this.renderer && template) {
        const rendered = await this.renderer.render(
          template,
          locale,
          job.message.context ?? {},
        );
        try {
          await this.mail.send({
            ...job.message,
            subject: rendered.subject,
            text: rendered.body,
            html: rendered.body,
          });
          if (this.statusStore) {
            await this.statusStore.set(job.id, MailSendStatus.SENT);
          }
        } catch (error) {
          if (this.statusStore) {
            await this.statusStore.set(job.id, MailSendStatus.FAILED);
          }
          throw error;
        }
      } else {
        try {
          await this.mail.send(job.message);
          if (this.statusStore) {
            await this.statusStore.set(job.id, MailSendStatus.SENT);
          }
        } catch (error) {
          if (this.statusStore) {
            await this.statusStore.set(job.id, MailSendStatus.FAILED);
          }
          throw error;
        }
      }
    }
    void this.queue.registerWorker('mail', handler);
  }
}
