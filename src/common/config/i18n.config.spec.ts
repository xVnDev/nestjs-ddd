/**
 * @file Unit tests for the i18n config slice.
 */

import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { i18nConfig, I18N_CONFIG } from './i18n.config.js';
import type { I18nConfig as I18nConfigType } from './i18n.config.js';

describe('i18nConfig', () => {
  it('returns typed values', () => {
    process.env.I18N_DEFAULT_LOCALE = 'fr';
    process.env.I18N_SUPPORTED_LOCALES = 'en,fr';
    process.env.I18N_TRANSLATIONS_PATH = 'src/modules/mail/i18n';
    const result = i18nConfig() as I18nConfigType;
    expect(result.defaultLocale).toBe('fr');
    expect(result.supportedLocales).toEqual(['en', 'fr']);
    expect(result.translationsPath).toBe('src/modules/mail/i18n');
  });

  it('is injectable via as Provider', async () => {
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      imports: [
        NestConfigModule.forRoot({ load: [i18nConfig], isGlobal: true }),
      ],
    }).compile();
    const configService = moduleRef.get(ConfigService);
    expect(configService.get('i18n.defaultLocale')).toBeDefined();
    expect(I18N_CONFIG).toBeDefined();
  });
});
