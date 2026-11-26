import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  ValidationPipe,
  ValidationPipeOptions,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '../src/common/config/config.module.js';
import { DomainExceptionFilter } from '../src/common/filters/index.js';
import {
  ConflictDomainError,
  NotFoundDomainError,
  UnauthorizedDomainError,
  ValidationDomainError,
} from '../src/modules/shared/domain/index.js';
import { ExampleDto } from '../src/common/dto/example.dto.js';

@Controller('domain-error-test')
class DomainErrorTestController {
  @Get('validation')
  validation() {
    throw new ValidationDomainError('invalid input');
  }

  @Get('unauthorized')
  unauthorized() {
    throw new UnauthorizedDomainError('not allowed');
  }

  @Get('not-found')
  notFound() {
    throw new NotFoundDomainError('missing');
  }

  @Get('conflict')
  conflict() {
    throw new ConflictDomainError('duplicate');
  }

  @Get('bad-request')
  badRequest() {
    throw new BadRequestException('bad payload');
  }

  @Get('unknown')
  unknown() {
    throw new Error('secret /app/src/secret.ts\nstack trace');
  }

  @Post('dto')
  @HttpCode(200)
  dto(@Body() dto: ExampleDto) {
    return dto;
  }
}

describe('Domain error filter (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule],
      controllers: [DomainErrorTestController],
    }).compile();

    app = moduleRef.createNestApplication();
    const configService = app.get(ConfigService);
    app.useGlobalPipes(
      new ValidationPipe(
        configService.get<ValidationPipeOptions>('validationPipe'),
      ),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    app.useSecurityHeaders({
      xFrameOptions: { action: 'deny' },
      strictTransportSecurity:
        configService.get('app.nodeEnv') === 'production',
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function assertHeaders(res: request.Response) {
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  }

  function assertProblem(res: request.Response, status: number) {
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body).toHaveProperty('type');
    expect(res.body).toHaveProperty('title');
    expect(res.body).toHaveProperty('status', status);
    expect(res.body).toHaveProperty('detail');
    expect(res.body).toHaveProperty('instance');
    assertHeaders(res);
  }

  it('maps ValidationDomainError to 400', async () => {
    const res = await request(app.getHttpServer())
      .get('/domain-error-test/validation')
      .expect(400);
    assertProblem(res, 400);
    expect(res.body.detail).toBe('invalid input');
  });

  it('maps UnauthorizedDomainError to 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/domain-error-test/unauthorized')
      .expect(401);
    assertProblem(res, 401);
  });

  it('maps NotFoundDomainError to 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/domain-error-test/not-found')
      .expect(404);
    assertProblem(res, 404);
  });

  it('maps ConflictDomainError to 409', async () => {
    const res = await request(app.getHttpServer())
      .get('/domain-error-test/conflict')
      .expect(409);
    assertProblem(res, 409);
  });

  it('maps HttpException to problem response', async () => {
    const res = await request(app.getHttpServer())
      .get('/domain-error-test/bad-request')
      .expect(400);
    assertProblem(res, 400);
    expect(res.body.detail).toBe('bad payload');
  });

  it('maps unknown errors to 500 without leakage', async () => {
    const res = await request(app.getHttpServer())
      .get('/domain-error-test/unknown')
      .expect(500);
    assertProblem(res, 500);
    expect(JSON.stringify(res.body)).not.toContain('secret');
    expect(JSON.stringify(res.body)).not.toContain('stack');
  });

  it('maps validation failures to 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/domain-error-test/dto')
      .send({})
      .expect(400);
    assertProblem(res, 400);
    expect(res.headers['content-type']).toContain('application/problem+json');
  });

  it('invokes the filter once per request', async () => {
    const filter = new DomainExceptionFilter();
    const spy = vi.spyOn(filter, 'catch');
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule],
      controllers: [DomainErrorTestController],
    }).compile();
    const scopedApp = moduleRef.createNestApplication();
    const configService = scopedApp.get(ConfigService);
    scopedApp.useGlobalPipes(
      new ValidationPipe(
        configService.get<ValidationPipeOptions>('validationPipe'),
      ),
    );
    scopedApp.useGlobalFilters(filter);
    await scopedApp.init();
    await request(scopedApp.getHttpServer())
      .get('/domain-error-test/not-found')
      .expect(404);
    expect(spy).toHaveBeenCalled();
    await scopedApp.close();
  });
});
