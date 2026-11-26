/**
 * @file OpenAPI / Scalar documentation setup.
 */

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { apiReference } from '@scalar/nestjs-api-reference';

import { shouldRegisterAdminDocs } from './scalar-api-reference.js';

interface PackageJson {
  version: string;
}

const packageJson = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '..', '..', '..', '..', 'package.json'),
    'utf8',
  ),
) as PackageJson;

/**
 * Filters an OpenAPI document's paths by admin tagging.
 *
 * @param document - The generated OpenAPI document.
 * @param includeAdmin - Whether to keep only admin-tagged operations.
 * @returns The filtered document.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isOperationEntry(operation: Record<string, unknown>): boolean {
  return 'responses' in operation || 'tags' in operation;
}

function operationTags(operation: Record<string, unknown>): string[] {
  return Array.isArray(operation.tags) ? (operation.tags as string[]) : [];
}

function isAdminTagged(operation: Record<string, unknown>): boolean {
  return operationTags(operation).includes('admin');
}

function filterPathItem(
  pathItem: Record<string, unknown>,
  includeAdmin: boolean,
): Record<string, unknown> | null {
  const filtered: Record<string, unknown> = {};
  let hasOperation = false;

  for (const [method, operation] of Object.entries(pathItem)) {
    if (!isPlainObject(operation)) {
      filtered[method] = operation;
      hasOperation = true;
      continue;
    }

    if (!isOperationEntry(operation)) {
      filtered[method] = operation;
      continue;
    }

    if (includeAdmin === isAdminTagged(operation)) {
      filtered[method] = operation;
      hasOperation = true;
    }
  }

  return hasOperation ? filtered : null;
}

function filterDocumentByTags(
  document: OpenAPIObject,
  includeAdmin: boolean,
): OpenAPIObject {
  if (!document || typeof document !== 'object' || !document.paths) {
    return document;
  }

  const paths: Record<string, unknown> = {};
  for (const [route, pathItem] of Object.entries(document.paths)) {
    if (!isPlainObject(pathItem)) {
      paths[route] = pathItem;
      continue;
    }

    const filtered = filterPathItem(pathItem, includeAdmin);
    if (filtered) {
      paths[route] = filtered;
    }
  }

  return { ...document, paths } as OpenAPIObject;
}

/**
 * Registers the user and (in non-production) admin OpenAPI documents plus the
 * Scalar UI.
 *
 * @param app - The Nest application instance.
 */
export function setupOpenApi(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const nodeEnv =
    typeof configService?.get === 'function'
      ? configService.get<string>('app.nodeEnv')
      : undefined;

  const version = packageJson.version;

  const userDocument = filterDocumentByTags(
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('nestjs-ddd API')
        .setDescription('nestjs-ddd API documentation')
        .setVersion(version)
        .addBearerAuth(
          { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          'bearer',
        )
        .build(),
    ),
    false,
  );

  SwaggerModule.setup('docs', app, userDocument, { ui: false, raw: ['json'] });

  app.use('/docs', apiReference({ url: '/docs-json' }));

  if (shouldRegisterAdminDocs(nodeEnv)) {
    const adminDocument = filterDocumentByTags(
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
          .setTitle('nestjs-ddd API')
          .setDescription('nestjs-ddd API documentation (admin)')
          .setVersion(version)
          .addBearerAuth(
            { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            'bearer',
          )
          .build(),
      ),
      true,
    );

    SwaggerModule.setup('admin/docs', app, adminDocument, {
      ui: false,
      raw: ['json'],
    });

    app.use('/admin/docs', apiReference({ url: '/admin/docs-json' }));
  }
}
