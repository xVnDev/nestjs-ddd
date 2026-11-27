/**
 * @file Typed mail configuration slice registered via registerAs.
 */

import { registerAs } from '@nestjs/config';
import type { Env } from './env.interface.js';

/** Typed shape of the mail configuration slice. */
export interface MailConfig {
  /** Default sender address. */
  from: string;
  /** Selected mail transport adapter. */
  provider: 'smtp' | 'memory';
  /** Optional SMTP connection URL. */
  smtpUrl?: string;
  /** Optional SMTP host. */
  smtpHost?: string;
  /** Optional SMTP port. */
  smtpPort?: number;
  /** Named queue used for async mail delivery. */
  queueName: 'mail';
  /** Default locale used when a message omits one. */
  defaultLocale: string;
}

/**
 * Typed mail configuration slice.
 *
 * @returns The mail config values derived from the environment.
 */
export const mailConfig = registerAs<MailConfig>('mail', () => {
  const env = process.env as unknown as Env;
  const from = env.MAIL_FROM || 'noreply@example.com';
  const smtpUrl = env.MAIL_SMTP_URL || undefined;
  const smtpHost = env.MAIL_SMTP_HOST || undefined;
  const parsedPort = Number(env.MAIL_SMTP_PORT);
  const smtpPort =
    Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : undefined;
  const defaultLocale = env.MAIL_DEFAULT_LOCALE || 'en';
  const provider = smtpUrl || smtpHost ? 'smtp' : 'memory';
  return {
    from,
    provider,
    smtpUrl,
    smtpHost,
    smtpPort,
    queueName: 'mail',
    defaultLocale,
  };
});

/** DI token under which the mail config slice is registered. */
export const MAIL_CONFIG = mailConfig.KEY;

export type MailConfigType = ReturnType<typeof mailConfig>;
