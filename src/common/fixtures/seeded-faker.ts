/**
 * @file Seeded Faker helper for deterministic test fixtures.
 */

import { Faker, en } from '@faker-js/faker';

/**
 * Creates a Faker instance seeded with the given number so generated values
 * are deterministic across runs.
 *
 * @param seed - Numeric seed used to initialize the faker generator.
 * @returns A seeded {@link Faker} instance.
 */
export function createSeededFaker(seed: number) {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);
  return faker;
}
