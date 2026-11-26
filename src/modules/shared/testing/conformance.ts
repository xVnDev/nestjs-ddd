/**
 * @file Reusable port conformance harness.
 *
 * `definePortConformance()` registers one Vitest `describe` block per adapter
 * using an identical spec body, creating a fresh adapter instance in
 * `beforeEach` so state cannot leak between adapters or tests.
 */

import { beforeEach, describe } from 'vitest';

/**
 * Factory producing a port adapter, synchronously or asynchronously.
 *
 * @typeParam T - The port interface the adapter implements.
 */
export type PortAdapterFactory<T> = () => T | Promise<T>;

/**
 * A named adapter entry for the conformance harness.
 *
 * @typeParam T - The port interface the adapter implements.
 */
export type PortAdapterEntry<T> = {
  /** Human-readable adapter name. */
  name: string;
  /** Factory producing a fresh adapter instance. */
  create: PortAdapterFactory<T>;
};

/**
 * Accessor handed to the spec body yielding the current (fresh) adapter.
 *
 * It is callable and also exposes named accessors for compatibility.
 *
 * @typeParam T - The port interface the adapter implements.
 */
export type PortAdapterAccessor<T> = (() => T) & {
  /** Returns the current adapter instance. */
  get: () => T;
  /** Returns the current adapter instance. */
  getAdapter: () => T;
  /** Returns the current adapter instance. */
  adapter: () => T;
};

/**
 * Registers one `describe` block per adapter, sharing a single spec body.
 *
 * @typeParam T - The port interface under test.
 * @param portName - Name of the port (used in describe titles).
 * @param adapters - Adapters to run the spec against.
 * @param spec - Spec body receiving a fresh adapter accessor.
 */
export function definePortConformance<T>(
  portName: string,
  adapters: ReadonlyArray<PortAdapterEntry<T>>,
  spec: (accessor: PortAdapterAccessor<T>) => void,
): void {
  for (const adapter of adapters) {
    describe(`${portName} :: ${adapter.name}`, () => {
      let instance: T;
      beforeEach(async () => {
        instance = await adapter.create();
      });
      const accessor = Object.assign(() => instance, {
        get: () => instance,
        getAdapter: () => instance,
        adapter: () => instance,
      }) as PortAdapterAccessor<T>;
      spec(accessor);
    });
  }
}
