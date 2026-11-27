/**
 * @file Joi environment schema, typed Env and validateEnv helper.
 */

import Joi from 'joi';

/** Joi schema validating the process environment. */
export const envSchema = Joi.object({
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),

  MAIL_HOST: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().email().allow('').optional(),
  MAIL_SMTP_URL: Joi.string().uri().allow('').optional(),
  MAIL_SMTP_HOST: Joi.string().allow('').optional(),
  MAIL_SMTP_PORT: Joi.number().integer().min(1).max(65535).optional(),
  MAIL_DEFAULT_LOCALE: Joi.string().allow('').optional(),
  REDIS_URL: Joi.string().allow('').optional(),
  JWT_PRIVATE_KEY_PATH: Joi.string().allow('').optional(),
  JWT_PUBLIC_KEY_PATH: Joi.string().allow('').optional(),

  QUEUE_REDIS_URL: Joi.string().uri().allow('').optional(),
  QUEUE_PREFIX: Joi.string().allow('').optional(),
  QUEUE_DEFAULT_ATTEMPTS: Joi.number().integer().min(1).optional(),

  DATABASE_URL: Joi.string().uri().required(),
  DATABASE_SSL: Joi.string().allow('').optional(),
  DATABASE_POOL_SIZE: Joi.number().integer().min(1).optional(),

  CACHE_REDIS_URL: Joi.string().uri().allow('').optional(),
  CACHE_TTL_SECONDS: Joi.number().integer().min(1).optional(),
});

/** Typed environment values produced by {@link validateEnv}. */
export interface Env {
  PORT: number;
  NODE_ENV: 'development' | 'test' | 'production';
  MAIL_HOST?: string;
  MAIL_FROM?: string;
  MAIL_SMTP_URL?: string;
  MAIL_SMTP_HOST?: string;
  MAIL_SMTP_PORT?: number;
  MAIL_DEFAULT_LOCALE?: string;
  REDIS_URL?: string;
  JWT_PRIVATE_KEY_PATH?: string;
  JWT_PUBLIC_KEY_PATH?: string;
  DATABASE_URL: string;
  DATABASE_SSL?: string;
  DATABASE_POOL_SIZE?: number;
  CACHE_REDIS_URL?: string;
  CACHE_TTL_SECONDS?: number;

  QUEUE_REDIS_URL?: string;
  QUEUE_PREFIX?: string;
  QUEUE_DEFAULT_ATTEMPTS?: number;
}

/**
 * Validates a raw environment object against {@link envSchema}.
 *
 * @param config - Raw environment values.
 * @returns The validated and typed environment.
 * @throws {Error} When validation fails.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const { error, value } = envSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  });
  if (error) {
    throw new Error(`Environment validation error: ${error.message}`);
  }
  return value as Env;
}
