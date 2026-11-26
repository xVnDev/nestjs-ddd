/**
 * @file Identifier generation port.
 */
export interface IdGenerator {
  next(): string;
}

export type IdGeneratorPort = IdGenerator;
