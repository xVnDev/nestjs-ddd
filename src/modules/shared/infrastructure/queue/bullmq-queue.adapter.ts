/**
 * @file BullMQ queue adapter implementing the shared QUEUE port.
 */

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import type { QueuePort, QueueJobOptions } from '../../ports/queue.port.js';
import { isPlainObject } from 'es-toolkit/predicate';

interface BullmqOptions {
  redisUrl?: string;
  prefix?: string;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: { type: 'exponential' | 'fixed'; delay: number };
    delay?: number;
    priority?: number;
  };
  connection?: unknown;
}

function isOptions(value: unknown): value is BullmqOptions {
  return (
    isPlainObject(value) &&
    ('redisUrl' in value ||
      'prefix' in value ||
      'defaultJobOptions' in value ||
      'connection' in value ||
      'attempts' in value)
  );
}

/**
 * BullMQ-backed queue adapter.
 */
export class BullmqQueueAdapter implements QueuePort {
  private readonly queues = new Map<string, InstanceType<typeof Queue>>();
  private readonly workers = new Map<string, any>();
  private readonly abandonmentHandlers = new Map<
    string,
    (payload: unknown) => void | Promise<void>
  >();
  private readonly prefix: string;
  private readonly defaultJobOptions: {
    attempts: number;
    backoff: { type: 'exponential' | 'fixed'; delay: number };
  };
  private readonly connection: unknown;

  constructor(...args: unknown[]) {
    const opts: BullmqOptions = {};
    for (const arg of args) {
      /* v8 ignore next */
      if (arg === undefined || arg === null) continue;
      if (typeof arg === 'string') {
        if (arg.startsWith('redis://') || arg.startsWith('rediss://')) {
          opts.redisUrl = arg;
        } else {
          opts.prefix = arg;
        }
        /* v8 ignore next 8 */
      } else if (isOptions(arg)) {
        const o = arg as BullmqOptions & {
          attempts?: number;
          backoff?: { type: 'exponential' | 'fixed'; delay: number };
        };
        if (o.redisUrl) opts.redisUrl = o.redisUrl;
        if (o.prefix) opts.prefix = o.prefix;
        /* v8 ignore next */
        if (o.connection) opts.connection = o.connection;
        /* v8 ignore next 5 */
        if (o.defaultJobOptions) {
          opts.defaultJobOptions = {
            ...opts.defaultJobOptions,
            ...o.defaultJobOptions,
          };
        } else if (o.attempts !== undefined || o.backoff) {
          opts.defaultJobOptions = {
            ...opts.defaultJobOptions,
            ...(o.attempts !== undefined ? { attempts: o.attempts } : {}),
            ...(o.backoff ? { backoff: o.backoff } : {}),
          };
        }
      }
    }

    this.prefix = opts.prefix ?? 'nestjs-ddd';
    this.defaultJobOptions = {
      attempts: opts.defaultJobOptions?.attempts ?? 3,
      backoff: opts.defaultJobOptions?.backoff ?? {
        type: 'exponential',
        delay: 1000,
      },
    };
    /* v8 ignore next 2 */
    if (opts.connection) {
      this.connection = opts.connection;
    } else if (opts.redisUrl) {
      this.connection = new (IORedis as any)(opts.redisUrl, {
        maxRetriesPerRequest: null,
      });
    } else {
      this.connection = undefined;
    }
  }

  private getQueue(name: string): InstanceType<typeof Queue> {
    let queue = this.queues.get(name);
    /* v8 ignore next 2 */
    if (!queue) {
      queue = new Queue(name, {
        prefix: this.prefix,
        connection: this.connection as any,
        defaultJobOptions: this.defaultJobOptions,
      });
      this.queues.set(name, queue);
    }
    return queue;
  }

  /** {@inheritDoc QueuePort.enqueue} */
  async enqueue(
    name: string,
    payload: unknown,
    options?: QueueJobOptions,
  ): Promise<void> {
    const queue = this.getQueue(name);
    await queue.add(name, payload, {
      attempts: options?.attempts ?? this.defaultJobOptions.attempts,
      backoff: this.defaultJobOptions.backoff,
      delay: options?.delay,
      priority: options?.priority,
    });
  }

  /** {@inheritDoc QueuePort.registerWorker} */
  registerWorker(
    name: string,
    handler: (payload: unknown) => void | Promise<void>,
  ): void | Promise<void> {
    if (this.workers.has(name)) return;
    const worker = new Worker(
      name,
      /* v8 ignore start */
      async (job: { data: unknown }) => {
        await handler(job.data);
      },
      /* v8 ignore stop */
      {
        prefix: this.prefix,
        connection: this.connection as any,
        concurrency: 1,
      },
    );
    this.workers.set(name, worker);
    const abandonmentHandler = this.abandonmentHandlers.get(name);
    if (abandonmentHandler) {
      worker.on('failed', (job: any) => {
        if (job && job.attemptsMade >= (job.opts?.attempts ?? 1)) {
          void abandonmentHandler(job.data);
        }
      });
    }
  }

  /** Registers an abandonment handler for a named queue. */
  registerAbandonmentHandler(
    name: string,
    handler: (payload: unknown) => void | Promise<void>,
  ): void {
    this.abandonmentHandlers.set(name, handler);
    const worker = this.workers.get(name);
    if (worker) {
      worker.on('failed', (job: any) => {
        if (job && job.attemptsMade >= (job.opts?.attempts ?? 1)) {
          void handler(job.data);
        }
      });
    }
  }

  /** {@inheritDoc QueuePort.close} */
  async close(): Promise<void> {
    await Promise.all(
      [...this.workers.values()].map(async (worker) => {
        await worker.close();
      }),
    );
    await Promise.all(
      [...this.queues.values()].map(async (queue) => {
        await queue.close();
      }),
    );
    this.workers.clear();
    this.queues.clear();
  }
}
