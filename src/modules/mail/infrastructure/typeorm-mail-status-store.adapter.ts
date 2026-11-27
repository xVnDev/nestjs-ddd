/**
 * @file TypeORM mail status store adapter.
 */

import type { EntityManager, Repository } from 'typeorm';
import type { MailSendStatus } from '../domain/mail-send-status.js';
import type { MailStatusStore } from '../domain/ports/mail-status-store.port.js';

export class TypeOrmMailStatusStoreAdapter implements MailStatusStore {
  private readonly repository?: Repository<any>;
  private readonly entityManager?: EntityManager;
  private readonly target: any;

  constructor(source: Repository<any> | EntityManager, target?: any) {
    if (target !== undefined) {
      this.entityManager = source as EntityManager;
      this.target = target;
    } else {
      this.repository = source as Repository<any>;
    }
  }

  private getRepository(): Repository<any> {
    if (this.repository) return this.repository;
    return (this.entityManager as EntityManager).getRepository(this.target);
  }

  async set(jobId: string, status: MailSendStatus): Promise<void> {
    const repo = this.getRepository();
    await repo.save({ jobId, status });
  }

  async get(jobId: string): Promise<MailSendStatus | null> {
    const repo = this.getRepository();
    const row = await repo.findOne({ where: { jobId } });
    return (row?.status as MailSendStatus) ?? null;
  }

  async listByStatus(status: MailSendStatus): Promise<string[]> {
    const repo = this.getRepository();
    const rows = await repo.find({ where: { status } });
    return rows.map((row: { jobId: string }) => row.jobId);
  }
}
