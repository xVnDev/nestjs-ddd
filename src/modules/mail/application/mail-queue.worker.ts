/**
 * @file Mail queue worker.
 */

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { MAIL, QUEUE } from '../../shared/ports/tokens.js';
import type { QueuePort, QueueHandler } from '../../shared/ports/queue.port.js';
import type { MailPort } from '../../shared/ports/mail.port.js';
import type { SendMailJob } from './mail-queue.producer.js';
import { MailTemplateRenderService } from './mail-template-render.service.js';

@Injectable()
export class MailQueueWorker implements OnModuleInit {
  constructor(
    @Inject(QUEUE) private readonly queue: QueuePort,
    @Inject(MAIL) private readonly mail: MailPort,
    private readonly renderer?: MailTemplateRenderService,
  ) {}

  onModuleInit(): void {
    const handler: QueueHandler = async (payload: unknown) => {
      const job = payload as SendMailJob;
      const locale = job.message.locale ?? 'en';
      if (this.renderer) {
        const rendered = await this.renderer.render(
          job.message.template ?? job.message.templateKey ?? 'welcome',
          locale,
          job.message.context ?? {},
        );
        await this.mail.send({
          ...job.message,
          subject: rendered.subject,
          text: rendered.body,
          html: rendered.body,
        });
      } else {
        await this.mail.send(job.message);
      }
    };
    void this.queue.registerWorker('mail', handler);
  }
}