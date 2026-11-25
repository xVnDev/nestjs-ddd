/**
 * @file OpenAPI / Scalar documentation setup.
 */

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
function filterDocumentByTags(document: any, includeAdmin: boolean): any {
  if (!document || typeof document !== 'object' || !document.paths) {
    return document;
  }

  const paths: Record<string, any> = {};
  for (const [route, pathItem] of Object.entries(document.paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      paths[route] = pathItem;
      continue;
    }

    const filtered: Record<string, any> = {};
    let hasOperation = false;
    for (const [method, operation] of Object.entries(pathItem)) {
      if (
        !operation ||
        typeof operation !== 'object' ||
        Array.isArray(operation)
      ) {
        filtered[method] = operation;
        hasOperation = true;
        continue;
      }

      // Preserve non-operation path-item members (e.g. parameters) only when
      // at least one operation survives filtering.
      const isOperation = 'responses' in operation || 'tags' in operation;
      if (!isOperation) {
        filtered[method] = operation;
        continue;
      }

      const tags = Array.isArray((operation as { tags?: unknown }).tags)
        ? ((operation as { tags: string[] }).tags ?? [])
        : [];
      const isAdmin = tags.includes('admin');
      if (includeAdmin === isAdmin) {
        filtered[method] = operation;
        hasOperation = true;
      }
    }

    if (hasOperation) {
      paths[route] = filtered;
    }
  }

  return { ...document, paths };
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

    SwaggerModule.setup('admin/docs', app, adminDocument, { ui: false, raw: ['json'] });

    app.use('/admin/docs', apiReference({ url: '/admin/docs-json' }));
  }
}
