/**
 * @file Unit tests for the mail config slice.
 */

import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { mailConfig, MAIL_CONFIG } from './mail.config.js';
import type { MailConfig as MailConfigType } from './mail.config.js';

describe('mailConfig', () => {
  it('returns typed values', () => {
    process.env.MAIL_FROM = 'from@example.com';
    process.env.MAIL_SMTP_URL = 'smtp://user:secret@smtp.example.com:587';
    process.env.MAIL_SMTP_HOST = 'smtp.example.com';
    process.env.MAIL_SMTP_PORT = '587';
    process.env.MAIL_DEFAULT_LOCALE = 'fr';
    const result = mailConfig() as MailConfigType;
    expect(result.from).toBe('from@example.com');
    expect(result.provider).toBe('smtp');
    expect(result.smtpUrl).toBe('smtp://user:secret@smtp.example.com:587');
    expect(result.smtpHost).toBe('smtp.example.com');
    expect(result.smtpPort).toBe(587);
    expect(result.queueName).toBe('mail');
    expect(result.defaultLocale).toBe('fr');
  });

  it('falls back to defaults when env is missing', () => {
    delete process.env.MAIL_FROM;
    delete process.env.MAIL_SMTP_URL;
    delete process.env.MAIL_SMTP_HOST;
    delete process.env.MAIL_SMTP_PORT;
    delete process.env.MAIL_DEFAULT_LOCALE;
    const result = mailConfig() as MailConfigType;
    expect(result.from).toBe('noreply@example.com');
    expect(result.provider).toBe('memory');
    expect(result.queueName).toBe('mail');
    expect(result.defaultLocale).toBe('en');
  });

  it('is injectable via as Provider', async () => {
    process.env.MAIL_FROM = 'from@example.com';
    process.env.MAIL_DEFAULT_LOCALE = 'en';
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [
        NestConfigModule.forRoot({ load: [mailConfig], isGlobal: true }),
      ],
    }).compile();
    const configService = moduleRef.get(ConfigService);
    expect(configService.get('mail.queueName')).toBe('mail');
    expect(MAIL_CONFIG).toBeDefined();
  });

  it('does not expose secrets in serialized form', () => {
    process.env.MAIL_SMTP_PASS = 'super-secret';
    const result = mailConfig() as MailConfigType;
    expect(JSON.stringify(result)).not.toContain('super-secret');
  });
});
