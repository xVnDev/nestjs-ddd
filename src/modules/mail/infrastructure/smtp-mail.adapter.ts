/**
 * @file SMTP mail transport adapter implementing the shared MAIL port.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { MailConfig } from '../../../common/config/mail.config.js';
import type { MailMessage, MailPort } from '../../shared/ports/mail.port.js';

type SendMailFn = (mail: Record<string, unknown>) => Promise<unknown>;

interface TransportLike {
  sendMail?: SendMailFn;
  send?: SendMailFn;
}

/**
 * SMTP-backed mail adapter.
 */
export class SmtpMailAdapter implements MailPort {
  private readonly transport: SendMailFn;
  private readonly from?: string;

  constructor(
    transportOrOptions:
      | TransportLike
      | SendMailFn
      | {
      transport?: TransportLike | SendMailFn;
      mailer?: TransportLike | SendMailFn;
      config?: Partial<MailConfig>;
      from?: string;
    } = {},
    configOrTransport?: Partial<MailConfig> | TransportLike | SendMailFn,
    config?: Partial<MailConfig>,
  ) {
    let transport: TransportLike | SendMailFn | undefined;
    let cfg: Partial<MailConfig> | undefined;

    if (
      transportOrOptions &&
      typeof transportOrOptions === 'object' &&
      ('sendMail' in transportOrOptions ||
        typeof (transportOrOptions as { send?: unknown }).send === 'function')
    ) {
      // first arg is a transport
      transport = transportOrOptions as TransportLike | SendMailFn;
      if (configOrTransport && typeof configOrTransport === 'object' && 'from' in (configOrTransport as object)) {
        cfg = configOrTransport as Partial<MailConfig>;
      }
    } else if (typeof transportOrOptions === 'function') {
      transport = transportOrOptions as SendMailFn;
      if (configOrTransport && typeof configOrTransport === 'object' && 'from' in (configOrTransport as object)) {
        cfg = configOrTransport as Partial<MailConfig>;
      }
    } else {
      const opts = (transportOrOptions ?? {}) as {
        transport?: TransportLike | SendMailFn;
        mailer?: TransportLike | SendMailFn;
        config?: Partial<MailConfig>;
        from?: string;
      };
      transport = opts.transport ?? opts.mailer;
      cfg = opts.config ?? config;
      if (opts.from) cfg = { ...(cfg ?? ({} as Partial<MailConfig>)), from: opts.from };
    }

    if (typeof transport === 'function') {
      this.transport = transport as SendMailFn;
    } else if (transport && typeof transport.sendMail === 'function') {
      this.transport = transport.sendMail.bind(transport);
    } else if (transport && typeof transport.send === 'function') {
      this.transport = transport.send.bind(transport);
    } else {
      // fall back to a nodemailer transporter built from config
      // prettier-ignore
      const transporter = nodemailer.createTransport( // NOSONAR
        cfg?.smtpUrl ?? {
          host: cfg?.smtpHost,
          port: cfg?.smtpPort,
        },
      ) as unknown as Transporter;
      this.transport = transporter.sendMail.bind(transporter);
    }

    this.from = cfg?.from;
  }

  /** {@inheritDoc MailPort.send} */
  async send(message: MailMessage): Promise<void> {
    const mail = {
      from: message.from ?? this.from,
      to: message.to,
      subject: message.subject,
      text: message.text ?? message.body,
      html: message.html,
    };
    await this.transport(mail);
  }
}

export { nodemailer };
