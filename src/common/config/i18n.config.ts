/**
 * @file Typed i18n configuration slice registered via registerAs.
 */

import { registerAs } from '@nestjs/config';

/** Typed shape of the i18n configuration slice. */
export interface I18nConfig {
  /** Default locale. */
  defaultLocale: string;
  /** Supported locales. */
  supportedLocales: string[];
  /** Translations directory path. */
  translationsPath: string;
}

/**
 * Typed i18n configuration slice.
 */
export const i18nConfig = registerAs<I18nConfig>('i18n', () => {
  const defaultLocale = process.env.I18N_DEFAULT_LOCALE || 'en';
  const supportedLocales = (process.env.I18N_SUPPORTED_LOCALES || 'en,fr')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const translationsPath =
    process.env.I18N_TRANSLATIONS_PATH || 'src/modules/mail/i18n';
  return { defaultLocale, supportedLocales, translationsPath };
});

/** DI token under which the i18n config slice is registered. */
export const I18N_CONFIG = i18nConfig.KEY;

export type I18nConfigType = ReturnType<typeof i18nConfig>;