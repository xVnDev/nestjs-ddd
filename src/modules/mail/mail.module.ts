/**
 * @file Composition root for the mail bounded context.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from '../shared/infrastructure/queue/queue.module.js';
import { MAIL } from '../shared/ports/tokens.js';
import {
  mailConfig,
  MAIL_CONFIG,
} from '../../common/config/mail.config.js';
import type { MailConfig as MailConfigType } from '../../common/config/mail.config.js';
import { SmtpMailAdapter } from './infrastructure/smtp-mail.adapter.js';
import { InMemoryMailAdapter } from './infrastructure/in-memory-mail.adapter.js';
import { MailQueueProducer } from './application/mail-queue.producer.js';
import { MailQueueWorker } from './application/mail-queue.worker.js';
import { MailTemplateRenderService } from './application/mail-template-render.service.js';
import { MailI18nModule } from './i18n/i18n.module.js';
import nodemailer from 'nodemailer';

@Module({
  imports: [ConfigModule.forFeature(mailConfig), QueueModule, MailI18nModule],
  providers: [
    MailQueueProducer,
    MailQueueWorker,
    MailTemplateRenderService,
    {
      provide: MAIL,
      useFactory: (cfg: MailConfigType) => {
        if (cfg.provider === 'memory' || (!cfg.smtpUrl && !cfg.smtpHost)) {
          return new InMemoryMailAdapter();
        }
        const transport = cfg.smtpUrl
          ? nodemailer.createTransport(cfg.smtpUrl)
          : nodemailer.createTransport({
              host: cfg.smtpHost,
              port: cfg.smtpPort,
            });
        return new SmtpMailAdapter(transport, cfg);
      },
      inject: [MAIL_CONFIG],
    },
  ],
  exports: [MAIL, MailQueueProducer],
})
export class MailModule {}
