/**
 * @file Composition root for the mail bounded context.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MAIL } from '../shared/ports/tokens.js';
import {
  mailConfig,
  MAIL_CONFIG,
} from '../../common/config/mail.config.js';
import type { MailConfig as MailConfigType } from '../../common/config/mail.config.js';
import { SmtpMailAdapter } from './adapters/smtp-mail.adapter.js';
import { InMemoryMailAdapter } from './adapters/in-memory-mail.adapter.js';
import nodemailer from 'nodemailer';

@Module({
  imports: [ConfigModule.forFeature(mailConfig)],
  providers: [
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
  exports: [MAIL],
})
export class MailModule {}