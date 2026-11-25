import { describe, expect, it } from 'vitest';

import { createSwaggerExamples } from './swagger-examples.js';

describe('createSwaggerExamples', () => {
  it('is deterministic for a fixed seed', () => {
    const first = createSwaggerExamples();
    const second = createSwaggerExamples();
    expect(first).toEqual(second);
  });
});
