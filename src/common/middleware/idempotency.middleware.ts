/**
 * @file Idempotency middleware backed by the shared CACHE port.
 */

import { createHash } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { CachePort } from '../../modules/shared/ports/cache.port.js';
import { CACHE_PORT } from '../../modules/shared/ports/tokens.js';
import type { IdempotencyConfig } from '../config/idempotency.config.js';

export interface IdempotencyCachedResponse {
  status: number;
  body: unknown;
}

export class IdempotencyMiddleware {
  constructor(
    private readonly cache: CachePort,
    private readonly config: IdempotencyConfig,
  ) {}

  private fingerprint(req: Request): string {
    const method = req.method;
    const path = req.originalUrl || req.url;
    const body = req.body;
    return createHash('sha256')
      .update(`${method}:${path}:${JSON.stringify(body ?? null)}`)
      .digest('hex');
  }

  private isEnabled(req: Request): boolean {
    if (!this.config.enabledRoutes || this.config.enabledRoutes.length === 0) {
      return true;
    }
    const route = `${req.method} ${req.path}`;
    return this.config.enabledRoutes.some((pattern) => route.includes(pattern));
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const keyHeader = (req.headers['idempotency-key'] ||
      req.headers['Idempotency-Key']) as string | undefined;
    if (!keyHeader || !this.isEnabled(req)) {
      next();
      return;
    }

    const fp = this.fingerprint(req);
    const cacheKey = `${this.config.keyPrefix}${fp}`;

    const cached = await this.cache.get<IdempotencyCachedResponse>(cacheKey);
    if (cached) {
      res.status(cached.status).json(cached.body);
      return;
    }

    const originalSend = res.send.bind(res);
    res.send = (body?: any) => {
      let cachedBody: any = body;
      if (typeof body === 'string') {
        try {
          cachedBody = JSON.parse(body);
        } catch {
          cachedBody = body;
        }
      }
      const payload: IdempotencyCachedResponse = {
        status: res.statusCode,
        body: cachedBody,
      };
      this.cache
        .set(cacheKey, payload, this.config.ttlSeconds)
        .then(() => originalSend(body))
        .catch(() => originalSend(body));
      return res;
    };

    next();
  }
}

export { CACHE_PORT };