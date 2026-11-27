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

  it('supports a function transport', async () => {
    const transport = vi.fn(async () => ({}));
    const adapter = new SmtpMailAdapter(transport, { from: 'from@example.com' });
    await adapter.send({ to: 'to@example.com', subject: 'subject', text: 'body' });
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'from@example.com', to: 'to@example.com' }),
    );
  });

  it('supports an options object with a transport', async () => {
    const transport = { sendMail: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter({ transport, from: 'from@example.com' });
    await adapter.send({ to: 'to@example.com', subject: 'subject', text: 'body' });
    expect(transport.sendMail).toHaveBeenCalled();
  });

  it('falls back to a nodemailer transport', () => {
    const adapter = new SmtpMailAdapter(
      {},
      { smtpHost: 'localhost', smtpPort: 1025, from: 'from@example.com' },
    );
    expect(adapter).toBeDefined();
  });

  it('handles a null transport argument', () => {
    const adapter = new SmtpMailAdapter(null as any, { smtpHost: 'localhost', smtpPort: 1025 });
    expect(adapter).toBeDefined();
  });

  it('supports a function transport without config', async () => {
    const transport = vi.fn(async () => ({}));
    const adapter = new SmtpMailAdapter(transport);
    await adapter.send({ to: 'to@example.com', subject: 'subject', text: 'body' });
    expect(transport).toHaveBeenCalled();
  });

  it('supports an object transport without config', async () => {
    const transport = { sendMail: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter(transport);
    await adapter.send({ to: 'to@example.com', subject: 'subject', text: 'body' });
    expect(transport.sendMail).toHaveBeenCalled();
  });

  it('uses body when text is missing', async () => {
    const transport = { sendMail: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter(transport, { from: 'from@example.com' });
    await adapter.send({ to: 'to@example.com', subject: 'subject', body: 'body' } as any);
    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'body' }),
    );
  });
});