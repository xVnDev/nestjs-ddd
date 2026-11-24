import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { ExampleDto } from '../src/common/dto/example.dto.js';
import { validationPipeOptions } from '../src/common/config/validation-pipe.config.js';

class EchoService {
  echo = vi.fn();
}

import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { ConfigModule } from "../src/common/config/config.module.js";

@Controller('validation')
class ValidationController {
  constructor(private readonly service: EchoService) {}

  @Post()
  @HttpCode(200)
  echo(@Body() dto: ExampleDto) {
    this.service.echo(dto);
    return dto;
  }
}

describe('Validation (e2e)', () => {
  let app: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule],
      controllers: [ValidationController],
      providers: [{ provide: EchoService, useValue: new EchoService() }],
    }).compile();
    app = moduleRef.createNestApplication();
    const configService: ConfigService = app.get(ConfigService);
    app.useGlobalPipes(new ValidationPipe(configService.get<ValidationPipeOptions>('validationPipe')));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unknown fields with 400', async () => {
    await request(app.getHttpServer())
      .post('/validation')
      .send({ name: 'Ada', email: 'ada@example.com', age: 1, extra: 'x' })
      .expect(400);
  });

  it('rejects missing required fields with 400', async () => {
    await request(app.getHttpServer())
      .post('/validation')
      .send({ email: 'ada@example.com', age: 1 })
      .expect(400);
  });

  it('transforms and echoes a valid payload', async () => {
    const service = app.get(EchoService);
    const res = await request(app.getHttpServer())
      .post('/validation')
      .send({ name: 'Ada', email: 'ada@example.com', age: '5' })
      .expect(200);
    expect(res.body.age).toBe(5);
    expect(service.echo).toHaveBeenCalled();
    const arg = service.echo.mock.calls[0][0];
    expect(arg).toBeInstanceOf(ExampleDto);
  });
});
