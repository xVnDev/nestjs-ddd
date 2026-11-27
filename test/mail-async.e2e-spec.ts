/**
 * @file E2E async mail delivery with in-memory adapters.
 */

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { startPostgres } from './support/postgres-container.js';
import { MAIL } from '../src/modules/shared/ports/tokens.js';
import { MailQueueProducer } from '../src/modules/mail/application/mail-queue.producer.js';
import type { MailPort } from '../src/modules/shared/ports/mail.port.js';

describe('mail-async (e2e)', () => {
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

  it('delivers one message to the in-memory outbox', async () => {
    const producer = app.get(MailQueueProducer);
    const mail = app.get(MAIL) as MailPort & { sent(): any[] };
    await producer.enqueueMail({
      to: 'to@example.com',
      subject: 'hi',
      text: 'body',
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mail.sent()).toHaveLength(1);
    expect(mail.sent()[0]).toMatchObject({
      to: 'to@example.com',
      subject: 'hi',
    });
  });
});
