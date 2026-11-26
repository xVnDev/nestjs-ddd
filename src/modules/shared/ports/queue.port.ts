/**
 * @file Queue port.
 */
export interface Queue {
  enqueue(name: string, payload: unknown): Promise<void>;
}

export type QueuePort = Queue;
