/**
 * @file Mail port spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { MAIL, MAIL_PORT } from './tokens.js';
import type { MailPort } from './mail.port.js';

describe('mail port', () => {
  it('exposes a unique token', () => {
    expect(typeof MAIL).toBe('symbol');
    expect(MAIL_PORT).toBe(MAIL);
    expect(Symbol.keyFor(MAIL)).toBe('MAIL');
  });

  it('accepts a vi.fn dummy implementation', async () => {
    const send = vi.fn(async () => undefined);
    const impl: MailPort = { send };
    await impl.send({ to: 'a@b.com', subject: 'hi' });
    expect(send).toHaveBeenCalledOnce();
  });
});
