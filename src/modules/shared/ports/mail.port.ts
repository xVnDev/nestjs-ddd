/**
 * @file Mail delivery port.
 */

/** Data-only message handed to a mail transport. */
export type MailMessage = {
  /** Recipient address. */
  to: string;
  /** Optional sender address; transports fall back to config. */
  from?: string;
  /** Rendered subject. Optional for template-driven messages resolved by the worker. */
  subject?: string;
  /** Rendered plain-text body. */
  text?: string;
  /** Rendered HTML body. */
  html?: string;
  /** Generic rendered body alias used by some transports. */
  body?: string;
  /** Template key (pre-render resolution). */
  template?: string;
  /** Template key alias. */
  templateKey?: string;
  /** Locale used for rendering. */
  locale?: string;
  /** Template context data. */
  context?: Record<string, unknown>;
};

/**
 * Narrow, transport-agnostic mail delivery port.
 */
export interface MailPort {
  send(message: MailMessage): Promise<void>;
}

/** Backwards-compatible alias for the mail port. */
export type Mail = MailPort;
