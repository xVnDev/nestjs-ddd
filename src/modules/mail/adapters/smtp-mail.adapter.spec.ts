/**
 * @file SMTP mail adapter spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { SmtpMailAdapter } from './smtp-mail.adapter.js';

describe('SmtpMailAdapter', () => {
  it('calls the transport with envelope fields', async () => {
    const transport = { sendMail: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter(transport, { from: 'from@example.com' });
    await adapter.send({
      to: 'to@example.com',
      subject: 'subject',
      text: 'body',
      locale: 'fr',
    });
    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'from@example.com',
        to: 'to@example.com',
        subject: 'subject',
        text: 'body',
      }),
    );
  });

  it('propagates transport failures', async () => {
    const transport = {
      sendMail: vi.fn(async () => {
        throw new Error('boom');
      }),
    };
    const adapter = new SmtpMailAdapter(transport, { from: 'from@example.com' });
    await expect(
      adapter.send({ to: 'to@example.com', subject: 'subject', text: 'body' }),
    ).rejects.toThrow('boom');
  });
});