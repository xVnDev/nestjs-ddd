/**
 * @file Clock port.
 */
export interface Clock {
  now(): Date;
}

export type ClockPort = Clock;
