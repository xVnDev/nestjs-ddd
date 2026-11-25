/**
 * @file Scalar API Reference helpers and environment guards.
 */

import { apiReference } from '@scalar/nestjs-api-reference';
import type { INestApplication } from '@nestjs/common';

/**
 * Guard predicate controlling whether admin-only documentation (and its
 * Scalar UI) is exposed. Admin docs are hidden in production.
 *
 * @param nodeEnv - The resolved `NODE_ENV` value.
 * @returns Whether admin docs/scalar should be registered.
 */
export function shouldRegisterAdminDocs(nodeEnv?: string): boolean {
  return nodeEnv !== 'production';
}

/**
 * Builds a Scalar handler pointing at the given OpenAPI JSON URL.
 *
 * @param url - The OpenAPI document URL.
 * @returns The Scalar request handler.
 */
export function createScalarHandler(url: string) {
  return apiReference({ url });
}

/**
 * Mounts the Scalar API Reference UI at the given path.
 *
 * @param app - The Nest application instance.
 * @param path - The mount path.
 * @param url - The OpenAPI document URL.
 */
export function mountScalarApiReference(
  app: INestApplication,
  path: string,
  url: string,
): void {
  app.use(path, apiReference({ url }));
}

export { apiReference };
