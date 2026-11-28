/**
 * @file User ORM entity.
 */

import { Column, Entity } from 'typeorm';
import { SoftDeleteEntity } from '../../../shared/infrastructure/persistence/soft-delete.entity.js';

@Entity('users')
export class UserOrmEntity extends SoftDeleteEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  sub!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
