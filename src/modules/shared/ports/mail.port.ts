/**
 * @file Mail delivery port.
 */
export type MailMessage = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

export interface Mail {
  send(message: MailMessage): Promise<void>;
}

export type MailPort = Mail;
export type Mailer = Mail;
