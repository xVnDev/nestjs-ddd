/**
 * @file Mail i18n module.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule, I18nJsonLoader } from 'nestjs-i18n';
import { join } from 'node:path';
import { i18nConfig, I18N_CONFIG } from '../../../common/config/i18n.config.js';
import type { I18nConfig as I18nConfigType } from '../../../common/config/i18n.config.js';

@Module({
  imports: [
    ConfigModule.forFeature(i18nConfig),
    I18nModule.forRootAsync({
      imports: [ConfigModule.forFeature(i18nConfig)],
      inject: [I18N_CONFIG],
      useFactory: (cfg: I18nConfigType) => ({
        fallbackLanguage: cfg.defaultLocale,
        loader: I18nJsonLoader,
        loaderOptions: {
          path: join(process.cwd(), cfg.translationsPath),
          watch: false,
        },
      }),
    }),
  ],
  exports: [I18nModule],
})
export class MailI18nModule {}
