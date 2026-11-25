/**
 * @file Typed observe configuration slice registered via registerAs.
 */

import { registerAs } from '@nestjs/config';
import { ObserveOptions } from '@nestjs/observe';

/**
 * Typed observe configuration slice.
 *
 * @returns The observe options derived from the environment.
 */
export const observeConfig = registerAs<ObserveOptions>('observe', () => ({
  appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
  appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
  serviceId: process.env.OBSERVE_SERVICE_ID ?? 'nestjs-dd',
}));
