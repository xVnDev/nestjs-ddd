/**
 * @file Deterministic faker-backed examples for Swagger/OpenAPI.
 */

import { Faker, en } from '@faker-js/faker';

/**
 * Creates a set of deterministic example values for Swagger documentation.
 *
 * @returns The generated example values.
 */
export function createSwaggerExamples() {
  const faker = new Faker({ locale: [en] });
  faker.seed(42);

  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: `${faker.internet.username()}@example.com`,
    age: faker.number.int({ min: 0, max: 99 }),
    createdAt: faker.date
      .recent({ days: 10, refDate: new Date('2026-01-01') })
      .toISOString(),
  };
}
