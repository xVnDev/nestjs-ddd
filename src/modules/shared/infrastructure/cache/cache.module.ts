/**
 * @file Cache module registering the Keyv Redis adapter behind CACHE_PORT.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CACHE_PORT } from '../../ports/tokens.js';
import { cacheConfig, CACHE_CONFIG } from '../../../../common/config/cache.config.js';
import type { CacheConfig as CacheConfigType } from '../../../../common/config/cache.config.js';
import { KeyvRedisCacheAdapter } from './keyv-redis-cache.adapter.js';

@Module({
  imports: [ConfigModule.forFeature(cacheConfig)],
  providers: [
    {
      provide: CACHE_PORT,
      useFactory: (cfg: CacheConfigType) => {
        return new KeyvRedisCacheAdapter({ redisUrl: cfg.redisUrl }, cfg.defaultTtlSeconds, cfg.namespace);
      },
      inject: [CACHE_CONFIG],
    },
  ],
  exports: [CACHE_PORT],
})
export class CacheModule {}