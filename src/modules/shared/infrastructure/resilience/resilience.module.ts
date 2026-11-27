/**
 * @file Resilience module registering the circuit breaker adapter.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CIRCUIT_BREAKER_PORT } from '../../ports/circuit-breaker.port.js';
import { InProcessCircuitBreakerAdapter } from './in-process-circuit-breaker.adapter.js';
import {
  resilienceConfig,
  RESILIENCE_CONFIG,
} from '../../../../common/config/resilience.config.js';
import type { ResilienceConfig as ResilienceConfigType } from '../../../../common/config/resilience.config.js';

@Module({
  imports: [ConfigModule.forFeature(resilienceConfig)],
  providers: [
    {
      provide: CIRCUIT_BREAKER_PORT,
      useFactory: (cfg: ResilienceConfigType) => {
        return new InProcessCircuitBreakerAdapter({
          failureThreshold: cfg.failureThreshold,
          resetTimeoutMs: cfg.resetTimeoutMs,
          halfOpenMaxCalls: cfg.halfOpenMaxCalls,
          clock: { now: () => new Date() },
        });
      },
      inject: [RESILIENCE_CONFIG],
    },
  ],
  exports: [CIRCUIT_BREAKER_PORT],
})
export class ResilienceModule {}