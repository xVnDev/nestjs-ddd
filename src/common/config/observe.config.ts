import { registerAs } from '@nestjs/config';
import { ObserveOptions } from '@nestjs/observe';

export const observeConfig = registerAs<ObserveOptions>('observe',() => ({
  appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
  appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
  serviceId: process.env.OBSERVE_SERVICE_ID ?? 'nestjs-dd',
}));
