import { registerAs } from '@nestjs/config';
import type { Env } from './env.interface.js';

export const appConfig = registerAs('app', () => {
  const env = process.env as unknown as Env;
  return {
    port: Number(env.PORT) || 3000,
    nodeEnv: env.NODE_ENV,
    apiPrefix: '/api',
  };
});

export type AppConfig = ReturnType<typeof appConfig>;
