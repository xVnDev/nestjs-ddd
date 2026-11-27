/**
 * @file SMTP mail adapter spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { SmtpMailAdapter } from './smtp-mail.adapter.js';

describe('SmtpMailAdapter', () => {
  it('calls the transport with envelope fields', async () => {
    const transport = { sendMail: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter(transport, {
      from: 'from@example.com',
    });
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
    const adapter = new SmtpMailAdapter(transport, {
      from: 'from@example.com',
    });
    await expect(
      adapter.send({ to: 'to@example.com', subject: 'subject', text: 'body' }),
    ).rejects.toThrow('boom');
  });

  it('supports a function transport', async () => {
    const transport = vi.fn(async () => ({}));
    const adapter = new SmtpMailAdapter(transport, {
      from: 'from@example.com',
    });
    await adapter.send({
      to: 'to@example.com',
      subject: 'subject',
      text: 'body',
    });
    expect(transport).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'from@example.com',
        to: 'to@example.com',
      }),
    );
  });

  it('supports a function transport without config', async () => {
    const transport = vi.fn(async () => ({}));
    const adapter = new SmtpMailAdapter(transport);
    await adapter.send({
      to: 'to@example.com',
      subject: 'subject',
      text: 'body',
    });
    expect(transport).toHaveBeenCalled();
  });

  it('supports an options object with transport and config', async () => {
    const transport = { sendMail: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter({
      transport,
      config: { from: 'cfg@example.com' },
    });
    await adapter.send({
      to: 'to@example.com',
      subject: 'subject',
      text: 'body',
    });
    expect(transport.sendMail).toHaveBeenCalled();
  });

  it('supports an options object with mailer and from', async () => {
    const transport = { sendMail: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter({
      mailer: transport,
      from: 'from@example.com',
    });
    await adapter.send({
      to: 'to@example.com',
      subject: 'subject',
      text: 'body',
    });
    expect(transport.sendMail).toHaveBeenCalled();
  });

  it('supports a transport exposing send instead of sendMail', async () => {
    const transport = { send: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter(transport as any, {
      from: 'from@example.com',
    });
    await adapter.send({
      to: 'to@example.com',
      subject: 'subject',
      text: 'body',
    });
    expect(transport.send).toHaveBeenCalled();
  });

  it('falls back to nodemailer when no transport is provided', async () => {
    const adapter = new SmtpMailAdapter({ from: 'from@example.com' });
    // nodemailer transporter is created; send will fail without a server,
    // but construction covers the fallback branch.
    expect(adapter).toBeDefined();
  });

  it('falls back to nodemailer with host/port config', async () => {
    const adapter = new SmtpMailAdapter({
      config: {
        smtpHost: 'localhost',
        smtpPort: 1025,
        from: 'from@example.com',
      },
    });
    expect(adapter).toBeDefined();
  });

  it('uses message.from and body fallback when sending', async () => {
    const transport = { sendMail: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter(transport);
    await adapter.send({
      to: 'to@example.com',
      subject: 'subject',
      body: 'body-text',
      html: '<p>html</p>',
      from: 'msg@example.com',
    });
    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'msg@example.com',
        to: 'to@example.com',
        subject: 'subject',
        text: 'body-text',
        html: '<p>html</p>',
      }),
    );
  });

  it('handles configOrTransport without from', async () => {
    const transport = { sendMail: vi.fn(async () => ({})) };
    const adapter = new SmtpMailAdapter(transport, {
      smtpHost: 'localhost',
    } as any);
    await adapter.send({
      to: 'to@example.com',
      subject: 'subject',
      text: 'body',
    });
    expect(transport.sendMail).toHaveBeenCalled();
  });
});
