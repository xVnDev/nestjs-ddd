/**
 * @file TypeORM soft-delete base entity.
 */

import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SoftDeletable } from '../../domain/soft-deletable.js';

/**
 * TypeORM-decorated persistence base mapped from {@link SoftDeletable}.
 */
export abstract class SoftDeleteEntity extends SoftDeletable {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @CreateDateColumn()
  declare createdAt: Date;

  @UpdateDateColumn()
  declare updatedAt: Date;

  @DeleteDateColumn()
  declare deletedAt: Date | null;
}
