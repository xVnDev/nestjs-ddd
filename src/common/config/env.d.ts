/**
 * Environment variables are always strings at the process boundary; the Joi
 * schema in `env.validation.ts` converts them into the typed values that
 * `ConfigService` exposes to the application.
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test';
      PORT?: string;
      MAIL_HOST?: string;
      REDIS_URL?: string;
      JWT_PRIVATE_KEY_PATH?: string;
      JWT_PUBLIC_KEY_PATH?: string;
      OBSERVE_APP_KEY?: string;
      OBSERVE_APP_SECRET?: string;
      OBSERVE_SERVICE_ID?: string;
    }
  }
}

export {};
