import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  const configService = app.get(ConfigService);
  app.useGlobalPipes(new ValidationPipe(configService.get<ValidationPipeOptions>('validationPipe')));
  await app.listen(configService.get<number>('app.port') ?? 3000);
}

void bootstrap();
