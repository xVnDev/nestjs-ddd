import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LoggerModule } from './logger.module.js';
import { describe, expect, it, vi } from 'vitest';

import { StructuredLoggerService } from './structured-logger.service.js';

describe('StructuredLoggerService', () => {
  const createConfigService = (nodeEnv: unknown) =>
    ({ get: vi.fn().mockReturnValue(nodeEnv) }) as unknown as ConfigService;

  it.each(['development', 'production'] as const)(
    'redacts parameters for every log level in %s mode',
    (nodeEnv) => {
      const logger = new StructuredLoggerService(createConfigService(nodeEnv));
      const spy =
        nodeEnv === 'production'
          ? vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
          : vi.spyOn(console, 'log').mockImplementation(() => {});

      const levels = ['log', 'error', 'warn', 'debug', 'verbose'] as const;
      for (const level of levels) {
        logger[level]('message', {
          token: 'secret-token',
          nested: { password: 'secret-password' },
        });
      }

      expect(spy).toHaveBeenCalledTimes(levels.length);
      const output =
        nodeEnv === 'production'
          ? spy.mock.calls.map((call) => String(call[0])).join('')
          : JSON.stringify(spy.mock.calls);

      expect(output).toContain('[REDACTED]');
      expect(output).not.toContain('secret-token');
      expect(output).not.toContain('secret-password');

      spy.mockRestore();
    },
  );

  it('writes development output without optional parameters', () => {
    const logger = new StructuredLoggerService(
      createConfigService('development'),
    );
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.log('no params');

    expect(consoleSpy).toHaveBeenCalledWith('[log]', 'no params');
    consoleSpy.mockRestore();
  });

  it('writes production output without optional parameters', () => {
    const logger = new StructuredLoggerService(
      createConfigService('production'),
    );
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    logger.log('no params');

    const output = String(stdoutSpy.mock.calls[0][0]);
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('log');
    expect(parsed.message).toBe('no params');
    expect(parsed.params).toBeUndefined();

    stdoutSpy.mockRestore();
  });

  it('falls back to development when nodeEnv is missing', () => {
    const logger = new StructuredLoggerService(createConfigService(undefined));
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.log('fallback');

    expect(consoleSpy).toHaveBeenCalledWith('[log]', 'fallback');
    consoleSpy.mockRestore();
  });

  it('is injectable through Nest dependency injection', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LoggerModule],
      providers: [
        {
          provide: ConfigService,
          useValue: createConfigService('development'),
        },
      ],
    }).compile();

    const service = moduleRef.get(StructuredLoggerService);
    expect(service).toBeInstanceOf(StructuredLoggerService);

    await moduleRef.close();
  });
});
