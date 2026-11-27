/* oxlint-disable typescript/unbound-method */
/**
 * @file Unit tests for the persistence module.
 */

import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersistenceModule } from './persistence.module.js';

vi.mock('@nestjs/typeorm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nestjs/typeorm')>();
  const getRepositoryToken = vi.fn(() => 'REPOSITORY_TOKEN');
  class TypeOrmModule {}
  (TypeOrmModule as any).forRootAsync = vi.fn(() => ({
    module: class MockPersistenceModule {},
    providers: [],
    exports: [],
  }));
  (TypeOrmModule as any).forFeature = vi.fn(() => ({
    module: class MockFeatureModule {},
    providers: [{ provide: 'REPOSITORY_TOKEN', useValue: {} }],
    exports: ['REPOSITORY_TOKEN'],
  }));
  return { ...actual, TypeOrmModule, getRepositoryToken };
});

describe('PersistenceModule', () => {
  it('registers TypeORM with postgres and injected config values', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PersistenceModule],
    }).compile();
    expect(moduleRef).toBeDefined();
    expect(TypeOrmModule.forRootAsync).toHaveBeenCalled();
    const options = (
      TypeOrmModule.forRootAsync as unknown as {
        mock: { calls: unknown[][] };
      }
    ).mock.calls[0][0] as {
      useFactory: (cfg: unknown) => unknown;
      inject: unknown[];
    };
    const cfg = {
      url: 'postgres://localhost:5432/db',
      ssl: false,
      poolSize: 10,
      logging: false,
      synchronize: false,
    };
    expect(options.useFactory(cfg)).toMatchObject({
      type: 'postgres',
      url: 'postgres://localhost:5432/db',
      synchronize: false,
    });
    expect(options.inject).toBeDefined();
  });

  it('uses a defined config injection token', () => {
    const options = (
      TypeOrmModule.forRootAsync as unknown as {
        mock: { calls: unknown[][] };
      }
    ).mock.calls[0][0] as { inject: unknown[] };
    expect(options.inject).toBeDefined();
    expect(options.inject.length).toBeGreaterThan(0);
  });
});
