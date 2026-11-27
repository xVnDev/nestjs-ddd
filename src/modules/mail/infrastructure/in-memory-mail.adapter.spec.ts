/**
 * @file In-memory mail adapter spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { InMemoryMailAdapter } from './in-memory-mail.adapter.js';

describe('InMemoryMailAdapter', () => {
  it('records deep copies in order', async () => {
    const adapter = new InMemoryMailAdapter();
    const message = { to: 'to@example.com', subject: 'subject', text: 'body' };
    await adapter.send(message);
    message.subject = 'changed';
    expect(adapter.sent()).toHaveLength(1);
    expect(adapter.sent()[0].subject).toBe('subject');
    expect(vi.isMockFunction(adapter.send)).toBe(true);
  });

  it('exposes delivered messages via the messages getter', async () => {
    const adapter = new InMemoryMailAdapter();
    await adapter.send({
      to: 'to@example.com',
      subject: 'subject',
      text: 'body',
    });
    expect(adapter.messages).toHaveLength(1);
    expect(adapter.messages[0].subject).toBe('subject');
  });

  it('keeps multiple messages in insertion order', async () => {
    const adapter = new InMemoryMailAdapter();
    await adapter.send({ to: 'a@example.com', subject: 'first', text: 'body' });
    await adapter.send({
      to: 'b@example.com',
      subject: 'second',
      text: 'body',
    });
    expect(adapter.sent().map((m) => m.subject)).toEqual(['first', 'second']);
  });
});
