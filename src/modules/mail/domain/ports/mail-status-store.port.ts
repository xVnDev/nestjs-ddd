/**
 * @file Mail status store port.
 */

import type { MailSendStatus } from '../mail-send-status.js';

export interface MailStatusStore {
  set(jobId: string, status: MailSendStatus): Promise<void> | void;
  get(jobId: string): Promise<MailSendStatus | null> | MailSendStatus | null;
  listByStatus(status: MailSendStatus): Promise<string[]> | string[];
}

export type MailStatusStorePort = MailStatusStore;