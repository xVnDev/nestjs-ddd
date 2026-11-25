import { Controller, Get, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';

import { LoggerModule } from '../src/common/logger/logger.module.js';
import { StructuredLoggerService } from '../src/common/logger/structured-logger.service.js';

@Controller('logger-e2e')
class LoggerE2eController {
  constructor(private readonly logger: StructuredLoggerService) {}

  @Get()
  get(@Req() request: { headers: Record<string, string> }) {
    this.logger.log('request headers', {
      authorization: request.headers.authorization,
    });
    return { ok: true };
  }
}

describe('Logger (e2e)', () => {
  let app: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LoggerModule],
      controllers: [LoggerE2eController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useLogger(moduleRef.get(StructuredLoggerService));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('redacts a token carried in a header', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    await request(app.getHttpServer())
      .get('/logger-e2e')
      .set('authorization', 'Bearer fake-token-123')
      .expect(200);

    const output = JSON.stringify([
      ...consoleSpy.mock.calls,
      ...stdoutSpy.mock.calls,
    ]);

    expect(output).toContain('[REDACTED]');
    expect(output).not.toContain('fake-token-123');

    consoleSpy.mockRestore();
    stdoutSpy.mockRestore();
  });
});
