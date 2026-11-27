/**
 * @file Queue module registering the queue adapter behind QUEUE.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QUEUE } from '../../ports/tokens.js';
import {
  queueConfig,
  QUEUE_CONFIG,
} from '../../../../common/config/queue.config.js';
import type { QueueConfig as QueueConfigType } from '../../../../common/config/queue.config.js';
import { BullmqQueueAdapter } from './bullmq-queue.adapter.js';
import { InMemoryQueueAdapter } from './in-memory-queue.adapter.js';

@Module({
  imports: [ConfigModule.forFeature(queueConfig)],
  providers: [
    {
      provide: QUEUE,
      useFactory: (cfg: QueueConfigType) => {
        if (cfg.adapter === 'memory' || !cfg.redisUrl) {
          return new InMemoryQueueAdapter({
            defaultJobOptions: cfg.defaultJobOptions,
          });
        }
        return new BullmqQueueAdapter(
          cfg.redisUrl,
          cfg.prefix,
          cfg.defaultJobOptions,
        );
      },
      inject: [QUEUE_CONFIG],
    },
  ],
  exports: [QUEUE],
})
export class QueueModule {}
