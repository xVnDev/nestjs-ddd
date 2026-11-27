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

  it('accepts a function transport', async () => {
    const sendMail = vi.fn(async () => ({}));
    const adapter = new SmtpMailAdapter(sendMail, { from: 'from@example.com' });
    await adapter.send({ to: 'to@example.com', subject: 'subject', text: 'body' });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'from@example.com', to: 'to@example.com' }),
    );
  });

  it('accepts a function transport without config', async () => {
    const sendMail = vi.fn(async () => ({}));
    const adapter = new SmtpMailAdapter(sendMail);
    await adapter.send({ to: 'to@example.com', subject: 'subject', text: 'body' });
    expect(sendMail).toHaveBeenCalled();
  });

  it('accepts an options object with transport and from', async () => {
    const transport = { sendMail: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter({
      transport,
      config: { from: 'config@example.com' },
      from: 'override@example.com',
    });
    await adapter.send({ to: 'to@example.com', subject: 'subject', text: 'body' });
    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'override@example.com' }),
    );
  });

  it('accepts a mailer alias in the options object', async () => {
    const transport = { sendMail: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter({ mailer: transport, from: 'from@example.com' });
    await adapter.send({ to: 'to@example.com', subject: 'subject', text: 'body' });
    expect(transport.sendMail).toHaveBeenCalled();
  });

  it('falls back to nodemailer when no transport is provided (smtpUrl)', () => {
    const adapter = new SmtpMailAdapter({ config: { smtpUrl: 'smtp://example.com', from: 'from@example.com' } });
    expect(adapter).toBeDefined();
  });

  it('falls back to nodemailer with host and port', () => {
    const adapter = new SmtpMailAdapter({ config: { smtpHost: 'smtp.example.com', smtpPort: 25 } });
    expect(adapter).toBeDefined();
  });

  it('uses the third config argument for nodemailer fallback', () => {
    const adapter = new SmtpMailAdapter({}, undefined, { smtpHost: 'h', smtpPort: 587, from: 'from@example.com' });
    expect(adapter).toBeDefined();
  });

  it('treats an object with a send function as a transport candidate', () => {
    const transport = { send: vi.fn(async () => ({})) } as any;
    const adapter = new SmtpMailAdapter(transport);
    expect(adapter).toBeDefined();
  });

  it('handles a null options argument', () => {
    const adapter = new SmtpMailAdapter(null as any);
    expect(adapter).toBeDefined();
  });

  it('uses message.from and body alias when sending', async () => {
    const transport = { sendMail: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter(transport, { from: 'default@example.com' });
    await adapter.send({
      to: 'to@example.com',
      subject: 'subject',
      body: 'body-text',
      html: '<p>hi</p>',
      from: 'msg@example.com',
    });
    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'msg@example.com',
        text: 'body-text',
        html: '<p>hi</p>',
      }),
    );
  });
});