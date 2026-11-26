import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1795719746297 implements MigrationInterface {
    name = 'Init1795719746297'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "soft_delete_entity" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_7c7020197b339763cdbabf9815f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_522f379f55d5428d19600022e4" ON "soft_delete_entity"  ("deletedAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_522f379f55d5428d19600022e4"`);
        await queryRunner.query(`DROP TABLE "soft_delete_entity"`);
    }

}
