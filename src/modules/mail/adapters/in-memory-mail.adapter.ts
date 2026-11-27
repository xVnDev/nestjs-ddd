/**
 * @file In-memory mail transport adapter implementing the shared MAIL port.
 */

import { vi } from 'vitest';
import type { MailMessage, MailPort } from '../../shared/ports/mail.port.js';

/**
 * Production-shaped in-memory mail fallback.
 */
export class InMemoryMailAdapter implements MailPort {
  private readonly outbox: MailMessage[] = [];

  /** Spyable send implementation. */
  public readonly send = vi.fn(async (message: MailMessage) => {
    this.outbox.push(structuredClone(message));
  });

  /** Returns a deep copy of the delivered messages. */
  sent(): MailMessage[] {
    return this.outbox.map((message) => structuredClone(message));
  }

  /** Alias for inspectability. */
  get messages(): MailMessage[] {
    return this.sent();
  }
}
