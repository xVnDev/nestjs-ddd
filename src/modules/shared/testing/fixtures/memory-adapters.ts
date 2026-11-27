/**
 * @file Test-only in-memory adapters for the shared port conformance specs.
 */

import { vi } from 'vitest';
import type {
  CachePort as Cache,
  Clock,
  EncryptionService,
  IdGenerator,
  Mail,
  MailMessage,
  PasswordHasher,
  Queue,
  TokenIssuer,
  Claims,
} from '../../ports/index.js';

export const passwordHasherMemoryAdapter = {
  name: 'in-memory',
  create: (): PasswordHasher => ({
    hash: async (plain: string) => `hashed:${plain}`,
    verify: async (plain: string, digest: string) =>
      digest === `hashed:${plain}`,
  }),
};

export const encryptionServiceMemoryAdapter = {
  name: 'in-memory',
  create: (): EncryptionService => ({
    encrypt: async (value: string) => `enc:${value}`,
    decrypt: async (ciphertext: string) => ciphertext.replace(/^enc:/, ''),
  }),
};

export const tokenIssuerMemoryAdapter = {
  name: 'in-memory',
  create: (): TokenIssuer => {
    const issue = vi.fn(async (payload: Claims) => JSON.stringify(payload));
    const verify = vi.fn(async (token: string) => JSON.parse(token) as Claims);
    return { issue, verify };
  },
};

export const idGeneratorMemoryAdapter = {
  name: 'in-memory',
  create: (): IdGenerator => {
    let n = 0;
    return { next: () => `id-${++n}` };
  },
};

export const clockMemoryAdapter = {
  name: 'in-memory',
  create: (): Clock => ({
    now: () => new Date('2026-01-01T00:00:00.000Z'),
  }),
};

export const cacheMemoryAdapter = {
  name: 'in-memory',
  create: () => {
    const store = new Map<string, unknown>();
    const get = async <T>(key: string): Promise<T | null> =>
      (store.get(key) as T) ?? null;
    const set = async <T>(key: string, value: T): Promise<void> => {
      store.set(key, value);
    };
    const deleteFn = vi.fn(async (key: string): Promise<void> => {
      store.delete(key);
    });
    const has = vi.fn(async (key: string): Promise<boolean> =>
      store.has(key),
    );
    const adapter: Cache = { get, set, delete: deleteFn, has };
    return adapter;
  },
};

/* v8 ignore next */
export const queueMemoryAdapter = {
  name: 'in-memory',
  create: () => {
    const jobs: Array<{ name: string; payload: unknown }> = [];
    const handlers = new Map<string, (payload: unknown) => void | Promise<void>>();
    const enqueue = vi.fn(async (name: string, payload: unknown) => {
      jobs.push({ name, payload });
    });
    const registerWorker = vi.fn(
      (name: string, handler: (payload: unknown) => void | Promise<void>) => {
        /* v8 ignore next */
        handlers.set(name, handler);
      },
    );
    const close = vi.fn(async () => undefined);
    const adapter: Queue = { enqueue, registerWorker, close };
    return adapter;
  },
};

export const mailMemoryAdapter = {
  name: 'in-memory',
  create: () => {
    const sent: MailMessage[] = [];
    const send = vi.fn(async (message: MailMessage) => {
      sent.push(message);
    });
    const adapter: Mail = { send };
    return adapter;
  },
};
