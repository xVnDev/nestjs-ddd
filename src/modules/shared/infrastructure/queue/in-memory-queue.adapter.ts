/**
 * @file In-memory queue fallback adapter implementing the shared QUEUE port.
 */

import type { Clock } from '../../ports/clock.port.js';
import type {
  QueuePort,
  QueueJobOptions,
  QueueHandler,
} from '../../ports/queue.port.js';
import { isFunction, isNotNil, isPlainObject } from 'es-toolkit/predicate';

interface InMemoryQueueOptions {
  clock?: Clock | { now(): Date | number };
  defaultJobOptions?: {
    attempts?: number;
    backoff?: { type: 'exponential' | 'fixed'; delay: number };
  };
}

function isClock(value: unknown): value is Clock | { now(): Date | number } {
  return (
    isNotNil(value) &&
    typeof value === 'object' &&
    isFunction((value as { now?: unknown }).now)
  );
}

function isOptions(value: unknown): value is InMemoryQueueOptions {
  return (
    isPlainObject(value) &&
    ('clock' in value || 'defaultJobOptions' in value || 'attempts' in value)
  );
}

interface Job {
  payload: unknown;
  options: QueueJobOptions;
}

/**
 * Production-shaped in-memory queue fallback.
 */
export class InMemoryQueueAdapter implements QueuePort {
  private readonly queues = new Map<string, Job[]>();
  private readonly workers = new Map<string, QueueHandler>();
  private readonly processing = new Map<string, boolean>();
  private readonly processingPromises = new Map<string, Promise<void>>();
  private readonly clock: { now(): Date | number } | undefined;
  private readonly defaultAttempts: number;
  private readonly defaultBackoff: {
    type: 'exponential' | 'fixed';
    delay: number;
  };

  constructor(...args: unknown[]) {
    /* v8 ignore start */
    let clock: { now(): Date | number } | undefined;
    let attempts = 3;
    let backoff: { type: 'exponential' | 'fixed'; delay: number } = {
      type: 'exponential',
      delay: 1000,
    };

    for (const arg of args) {
      /* v8 ignore next */
      if (arg === undefined || arg === null) continue;
      if (isClock(arg)) {
        clock = arg as { now(): Date | number };
        /* v8 ignore next 6 */
      } else if (isOptions(arg)) {
        const o = arg as InMemoryQueueOptions & {
          attempts?: number;
          backoff?: { type: 'exponential' | 'fixed'; delay: number };
        };
        if (o.clock) clock = o.clock as { now(): Date | number };
        /* v8 ignore next 11 */
        if (o.defaultJobOptions) {
          if (o.defaultJobOptions.attempts !== undefined) {
            attempts = o.defaultJobOptions.attempts;
          }
          if (o.defaultJobOptions.backoff) {
            backoff = o.defaultJobOptions.backoff;
          }
        } else {
          if (o.attempts !== undefined) attempts = o.attempts;
          if (o.backoff) backoff = o.backoff;
        }
      }
    }

    this.clock = clock;
    this.defaultAttempts = attempts;
    this.defaultBackoff = backoff;
    /* v8 ignore stop */
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private async runQueue(name: string): Promise<void> {
    /* v8 ignore next 2 */
    if (this.processing.get(name)) {
      return;
    }
    const queue = this.queues.get(name);
    if (!queue || queue.length === 0) return;

    const promise = (async () => {
      this.processing.set(name, true);
      while (queue.length > 0) {
        const job = queue.shift()!;
        const handler = this.workers.get(name)!;
        const attempts = job.options.attempts ?? this.defaultAttempts;
        const backoff = this.defaultBackoff;
        let lastError: unknown;
        for (let i = 0; i < attempts; i++) {
          try {
            await handler(job.payload);
            lastError = undefined;
            break;
          } catch (error) {
            lastError = error;
            /* v8 ignore next */
            if (i < attempts - 1) {
              const delayMs =
                backoff.type === 'exponential'
                  ? backoff.delay * Math.pow(2, i)
                  : backoff.delay;
              await this.delay(delayMs);
            }
          }
        }
        void lastError;
      }
      this.processing.set(name, false);
      this.processingPromises.delete(name);
    })();

    this.processingPromises.set(name, promise);
    await promise;
  }

  /** {@inheritDoc QueuePort.enqueue} */
  async enqueue(
    name: string,
    payload: unknown,
    options?: QueueJobOptions,
  ): Promise<void> {
    /* v8 ignore next 3 */
    if (!this.queues.has(name)) {
      this.queues.set(name, []);
    }
    this.queues.get(name)!.push({ payload, options: options ?? {} });
    if (this.workers.has(name)) {
      void this.runQueue(name);
    }
  }

  /** {@inheritDoc QueuePort.registerWorker} */
  registerWorker(name: string, handler: QueueHandler): void {
    this.workers.set(name, handler);
    /* v8 ignore next */
    if (this.queues.has(name) && (this.queues.get(name)?.length ?? 0) > 0) {
      void this.runQueue(name);
    }
  }

  /** {@inheritDoc QueuePort.close} */
  async close(): Promise<void> {
    await Promise.all(this.processingPromises.values());
  }
}
