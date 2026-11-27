/**
 * @file E2E localized mail rendering.
 */

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { startPostgres } from './support/postgres-container.js';
import { MAIL } from '../src/modules/shared/ports/tokens.js';
import { MailQueueProducer } from '../src/modules/mail/application/mail-queue.producer.js';

describe('mail-i18n (e2e)', () => {
  let app: INestApplication;
  let container: Awaited<ReturnType<typeof startPostgres>>['container'];

  beforeAll(async () => {
    const pg = await startPostgres();
    container = pg.container;
    process.env.DATABASE_URL = pg.url;
    process.env.NODE_ENV = 'test';
    delete process.env.QUEUE_REDIS_URL;
    delete process.env.MAIL_SMTP_URL;
    delete process.env.MAIL_SMTP_HOST;

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
    if (container) await container.stop();
  });

  it('renders two locales distinctly', async () => {
    const producer = app.get(MailQueueProducer);
    const mail = app.get(MAIL) as any;
    await producer.enqueueMail({
      to: 'to@example.com',
      subject: 'welcome',
      template: 'welcome',
      locale: 'en',
      context: { name: 'Ada', appName: 'App' },
    });
    await producer.enqueueMail({
      to: 'to@example.com',
      subject: 'welcome',
      template: 'welcome',
      locale: 'fr',
      context: { name: 'Ada', appName: 'App' },
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    const sent = mail.sent();
    expect(sent).toHaveLength(2);
    const subjects = sent.map((m: any) => m.subject);
    expect(new Set(subjects).size).toBe(2);
  });
});