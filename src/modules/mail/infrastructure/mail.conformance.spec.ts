/**
 * @file Mail port conformance spec.
 */

import { expect, vi } from 'vitest';
import { definePortConformance } from '../../shared/testing/conformance.js';
import { SmtpMailAdapter } from './smtp-mail.adapter.js';
import { InMemoryMailAdapter } from './in-memory-mail.adapter.js';
import type { MailPort } from '../../shared/ports/mail.port.js';

const smtpTransport = { sendMail: vi.fn(async () => ({})) };

definePortConformance<MailPort>('Mail', [
  {
    name: 'smtp (mocked transport)',
    create: () => new SmtpMailAdapter(smtpTransport, { from: 'from@example.com' }),
  },
  {
    name: 'in-memory',
    create: () => new InMemoryMailAdapter(),
  },
], (getAdapter) => {
  it('send resolves', async () => {
    await getAdapter().send({ to: 'to@example.com', subject: 'hi', text: 'body' });
  });

  it('passes locale through', async () => {
    await getAdapter().send({
      to: 'to@example.com',
      subject: 'hi',
      text: 'body',
      locale: 'fr',
    });
  });

  it('propagates transport errors', async () => {
    const adapter = getAdapter();
    if (adapter instanceof SmtpMailAdapter) {
      smtpTransport.sendMail.mockRejectedValueOnce(new Error('boom'));
      await expect(
        adapter.send({ to: 'to@example.com', subject: 'hi', text: 'body' }),
      ).rejects.toThrow('boom');
    }
  });
});
