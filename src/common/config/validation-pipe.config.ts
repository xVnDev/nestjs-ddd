import { registerAs } from '@nestjs/config';
import type { ValidationPipeOptions } from '@nestjs/common';

export const validationPipeOptions: ValidationPipeOptions = {
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
};

export const validationPipeConfig = registerAs(
  'validationPipe',
  () => validationPipeOptions,
);
