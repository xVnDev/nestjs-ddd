import { Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import {
  validationPipeConfig,
  validationPipeOptions,
} from './validation-pipe.config.js';

describe('validationPipeConfig', () => {
  it('enables whitelist, transform and forbidNonWhitelisted', () => {
    expect(validationPipeOptions.whitelist).toBe(true);
    expect(validationPipeOptions.transform).toBe(true);
    expect(validationPipeOptions.forbidNonWhitelisted).toBe(true);
    expect(
      validationPipeOptions.transformOptions?.enableImplicitConversion,
    ).toBe(true);
  });

  it('is injectable through config module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [validationPipeConfig],
          isGlobal: true,
        }),
      ],
    }).compile();

    const configService = moduleRef.get(ConfigService);
    expect(configService.get('validationPipe')).toEqual(validationPipeOptions);
  });

  it('type-checks as a Provider', () => {
    const provider = validationPipeConfig as unknown as Provider;
    expect(provider).toBeDefined();
  });
});
