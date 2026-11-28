/**
 * @file Add users table migration.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersTable1795719746298 implements MigrationInterface {
  name = 'AddUsersTable1795719746298';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "sub" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "passwordHash" character varying, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_users" PRIMARY KEY ("id"), CONSTRAINT "UQ_users_sub" UNIQUE ("sub"), CONSTRAINT "UQ_users_email" UNIQUE ("email"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_deletedAt" ON "users" ("deletedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_users_deletedAt"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
