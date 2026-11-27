/**
 * @file Mail template render service.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Handlebars from 'handlebars';
import type { I18nService } from 'nestjs-i18n';
import type { TemplateRenderer } from '../domain/ports/template-renderer.port.js';

function resolveDefaultLocale(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object' && 'defaultLocale' in input) {
    return String((input as { defaultLocale: unknown }).defaultLocale || 'en');
  }
  return 'en';
}

export class MailTemplateRenderService implements TemplateRenderer {
  private readonly defaultLocale: string;

  constructor(
    private readonly i18n: I18nService | { translate: (key: string, options?: any) => any },
    defaultLocaleOrConfig: string | { defaultLocale?: string } = 'en',
  ) {
    this.defaultLocale = resolveDefaultLocale(defaultLocaleOrConfig);
  }

  private localePath(locale: string, key: string): string {
    return join(
      process.cwd(),
      'src/modules/mail/adapters/templates',
      locale,
      `${key}.hbs`,
    );
  }

  async render(
    key: string,
    locale: string,
    context: Record<string, unknown> = {},
  ): Promise<{ subject: string; body: string }> {
    const resolvedLocale = existsSync(this.localePath(locale, key))
      ? locale
      : this.defaultLocale;
    const source = readFileSync(this.localePath(resolvedLocale, key), 'utf8');
    const template = Handlebars.compile(source);
    const body = template(context);

    let subject: string;
    try {
      const translated = await (this.i18n as any).translate(
        `mail.${key}.subject`,
        { lang: resolvedLocale, args: context },
      );
      subject = typeof translated === 'string' ? translated : String(translated);
    } catch {
      subject = key;
    }
    // interpolate subject placeholders manually if i18n returns template
    subject = Handlebars.compile(subject)(context);

    return { subject, body };
  }
}