/**
 * @file Test-only dummy adapters for the conformance harness self-test.
 */

import { vi } from 'vitest';

export interface Greeter {
  greet(name: string): string;
  items: string[];
}

export const inMemoryGreeterFactory = vi.fn(() => {
  const items: string[] = [];
  return {
    items,
    greet: (name: string): string => {
      items.push(name);
      return `hi ${name}`;
    },
  };
});

export const alternateGreeterFactory = vi.fn(async () => {
  const items: string[] = [];
  return {
    items,
    greet: (name: string): string => {
      items.push(name);
      return `hi ${name}`;
    },
  };
});

export const brokenGreeterFactory = vi.fn(() => ({
  items: [] as string[],
  greet: (): string => 42 as unknown as string,
}));

export const inMemoryGreeterAdapter = {
  name: 'in-memory',
  create: inMemoryGreeterFactory,
};

export const alternateGreeterAdapter = {
  name: 'alternate',
  create: alternateGreeterFactory,
};

export const brokenGreeterAdapter = {
  name: 'broken',
  create: brokenGreeterFactory,
};
