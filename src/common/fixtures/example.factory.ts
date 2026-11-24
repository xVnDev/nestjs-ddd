import { createSeededFaker } from './seeded-faker.js';

export interface ExampleShape {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

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
