/**
 * @file Example fixture factory built on the seeded Faker helper.
 */

import { createSeededFaker } from './seeded-faker.js';

/**
 * Shape of an example fixture returned by {@link createExampleFixture}.
 */
export interface ExampleShape {
  /** Unique identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Email address on the reserved example.com domain. */
  email: string;
  /** ISO timestamp of creation. */
  createdAt: string;
}

/**
 * Creates a deterministic example fixture, optionally overridden.
 *
 * @param overrides - Partial values that override the generated defaults.
 * @returns The generated example fixture.
 */
export function createExampleFixture(
  overrides: Partial<ExampleShape> = {},
): ExampleShape {
  const faker = createSeededFaker(1);
  const base: ExampleShape = {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: `${faker.internet.username()}@example.com`,
    createdAt: faker.date
      .recent({ days: 10, refDate: new Date('2026-01-01') })
      .toISOString(),
  };
  return { ...base, ...overrides };
}
