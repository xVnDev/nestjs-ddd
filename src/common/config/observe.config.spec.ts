import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import type { ObserveOptions } from '@nestjs/observe';
import { observeConfig } from './observe.config.js';

describe('observeConfig', () => {
  it('returns typed values', () => {
    process.env.OBSERVE_APP_KEY = 'key';
    process.env.OBSERVE_APP_SECRET = 'secret';
    process.env.OBSERVE_SERVICE_ID = 'svc';
    const result = observeConfig() as ObserveOptions;
    expect(result.appKey).toBe('key');
    expect(result.appSecret).toBe('secret');
    expect(result.serviceId).toBe('svc');
  });

  it('falls back to defaults when env is missing', () => {
    delete process.env.OBSERVE_APP_KEY;
    delete process.env.OBSERVE_APP_SECRET;
    delete process.env.OBSERVE_SERVICE_ID;
    const result = observeConfig() as ObserveOptions;
    expect(result.appKey).toBe('YOUR_APP_KEY');
    expect(result.appSecret).toBe('YOUR_APP_SECRET');
    expect(result.serviceId).toBe('nestjs-dd');
  });

  it('is injectable via as Provider', async () => {
    process.env.OBSERVE_APP_KEY = 'key';
    process.env.OBSERVE_APP_SECRET = 'secret';
    process.env.OBSERVE_SERVICE_ID = 'svc';
    const moduleRef = await Test.createTestingModule({
      imports: [
        NestConfigModule.forRoot({ load: [observeConfig], isGlobal: true }),
      ],
    }).compile();
    const configService = moduleRef.get(ConfigService);
    expect(configService.get('observe.appKey')).toBe('key');
    expect(configService.get('observe.serviceId')).toBe('svc');
  });
});
