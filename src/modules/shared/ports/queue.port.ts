/**
 * @file Queue port.
 */

/** Options applied to an enqueued job. */
export type QueueJobOptions = {
  /** Number of attempts before the job is considered failed. */
  attempts?: number;
  /** Delay in milliseconds before the first attempt. */
  delay?: number;
  /** Job priority. */
  priority?: number;
};

/** Handler invoked for each job of a named queue. */
export type QueueHandler = (payload: unknown) => void | Promise<void>;

/**
 * Narrow queue port covering the producer/worker split.
 *
 * Implementations must be swappable behind the {@link QUEUE} token.
 */
export interface QueuePort {
  enqueue(
    name: string,
    payload: unknown,
    options?: QueueJobOptions,
  ): Promise<void>;
  registerWorker(name: string, handler: QueueHandler): void | Promise<void>;
  registerAbandonmentHandler?(
    name: string,
    handler: (payload: unknown) => void | Promise<void>,
  ): void;
  close(): Promise<void>;
}

/** Backwards-compatible alias for the queue port. */
export type Queue = QueuePort;
