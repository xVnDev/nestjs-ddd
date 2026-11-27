/**
 * @file Mail send status spec.
 */

import { describe, expect, it } from 'vitest';
import { MailSendStatus, canTransition } from './mail-send-status.js';

describe('MailSendStatus', () => {
  it('contains all five states', () => {
    expect(Object.values(MailSendStatus)).toEqual([
      'QUEUED',
      'PROCESSING',
      'SENT',
      'FAILED',
      'ABANDONED',
    ]);
  });

  it('allows legal transitions', () => {
    expect(
      canTransition(MailSendStatus.QUEUED, MailSendStatus.PROCESSING),
    ).toBe(true);
    expect(canTransition(MailSendStatus.PROCESSING, MailSendStatus.SENT)).toBe(
      true,
    );
    expect(
      canTransition(MailSendStatus.PROCESSING, MailSendStatus.FAILED),
    ).toBe(true);
    expect(
      canTransition(MailSendStatus.PROCESSING, MailSendStatus.ABANDONED),
    ).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition(MailSendStatus.SENT, MailSendStatus.PROCESSING)).toBe(
      false,
    );
    expect(canTransition(MailSendStatus.ABANDONED, MailSendStatus.QUEUED)).toBe(
      false,
    );
  });
});
