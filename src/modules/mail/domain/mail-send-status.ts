/**
 * @file Mail send status lifecycle.
 */

/** Lifecycle states for a queued mail job. */
export enum MailSendStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  ABANDONED = 'ABANDONED',
}

const ALLOWED: Record<MailSendStatus, MailSendStatus[]> = {
  [MailSendStatus.QUEUED]: [MailSendStatus.PROCESSING, MailSendStatus.ABANDONED],
  [MailSendStatus.PROCESSING]: [
    MailSendStatus.SENT,
    MailSendStatus.FAILED,
    MailSendStatus.ABANDONED,
  ],
  [MailSendStatus.FAILED]: [
    MailSendStatus.PROCESSING,
    MailSendStatus.ABANDONED,
  ],
  [MailSendStatus.SENT]: [],
  [MailSendStatus.ABANDONED]: [],
};

/**
 * Returns true when a transition is allowed.
 */
export function canTransition(from: MailSendStatus, to: MailSendStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}