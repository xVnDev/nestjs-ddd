import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { HealthController } from './interfaces/health.controller';
import { HealthModule } from './health.module';

describe('HealthModule', () => {
  it('compiles and resolves HealthController', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();
    expect(moduleRef.get(HealthController)).toBeDefined();
  });
});
