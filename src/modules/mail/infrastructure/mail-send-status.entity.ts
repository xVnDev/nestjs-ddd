/**
 * @file TypeORM entity for mail send status.
 */

import {
  Entity,
  Index,
  CreateDateColumn,
  PrimaryColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { MailSendStatus } from '../domain/mail-send-status.js';

@Entity('mail_send_status')
export class MailSendStatusEntity {
  @PrimaryColumn()
  jobId!: string;

  @Index()
  @Column({ type: 'varchar' })
  status!: MailSendStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
