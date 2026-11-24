import { Faker, en } from '@faker-js/faker';

export function createSeededFaker(seed: number) {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);
  return faker;
}
