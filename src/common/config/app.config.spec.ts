import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { appConfig } from './app.config.js';

describe('appConfig', () => {
  it('returns typed values', () => {
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'test';
    const result = appConfig();
    expect(result.port).toBe(3000);
    expect(result.nodeEnv).toBe('test');
    expect(result.apiPrefix).toBe('/api');
  });

  it('falls back to default port when PORT is missing', () => {
    delete process.env.PORT;
    process.env.NODE_ENV = 'test';
    const result = appConfig();
    expect(result.port).toBe(3000);
  });

  it('is injectable via as Provider', async () => {
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [
        NestConfigModule.forRoot({ load: [appConfig], isGlobal: true }),
      ],
    }).compile();
    const configService = moduleRef.get(ConfigService);
    expect(configService.get('app.port')).toBe(3000);
  });
});
