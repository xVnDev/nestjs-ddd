/**
 * @file OpenAPI setup.
 */

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface PackageJson {
  version: string;
}

const packageJson = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', '..', '..', '..', 'package.json'), 'utf8'),
) as PackageJson;

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
      if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
        filtered[method] = operation;
        hasOperation = true;
        continue;
      }
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

export function setupOpenApi(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const nodeEnv =
    typeof configService?.get === 'function'
      ? configService.get<string>('app.nodeEnv')
      : undefined;
  void nodeEnv;

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

  SwaggerModule.setup('docs', app, userDocument);
}
