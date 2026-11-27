/**
 * @file Mail adapter equivalence spec.
 */

import { describe, expect, it } from 'vitest';
import { SmtpMailAdapter } from './smtp-mail.adapter.js';
import { InMemoryMailAdapter } from './in-memory-mail.adapter.js';

describe('mail adapter equivalence', () => {
  it('both adapters accept the same message shape', async () => {
    const transport = { sendMail: async () => ({}) };
    const smtp = new SmtpMailAdapter(transport, { from: 'from@example.com' });
    const memory = new InMemoryMailAdapter();
    const message = { to: 'to@example.com', subject: 'subject', text: 'body' };
    await smtp.send(message);
    await memory.send(message);
    expect(memory.sent()).toHaveLength(1);
  });
});