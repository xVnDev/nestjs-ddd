/**
 * @file Unit tests for the Swagger example factory.
 */

import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { ExampleDto } from '../dto/example.dto.js';
import { createSwaggerExamples } from './swagger-examples.js';

describe('createSwaggerExamples', () => {
  it('is deterministic for a fixed seed', () => {
    const first = createSwaggerExamples();
    const second = createSwaggerExamples();
    expect(first).toEqual(second);
  });

  it('validates against ExampleDto', () => {
    const examples = createSwaggerExamples();
    const dto = Object.assign(new ExampleDto(), examples);
    expect(validateSync(dto)).toHaveLength(0);
  });
});
