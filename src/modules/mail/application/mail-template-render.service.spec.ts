/**
 * @file Mail template render service spec.
 */

import { describe, expect, it, vi } from 'vitest';
import { MailTemplateRenderService } from './mail-template-render.service.js';

describe('MailTemplateRenderService', () => {
  it('renders localized subject and body', async () => {
    const i18n = {
      translate: vi.fn(async (key: string, opts: any) =>
        opts?.lang === 'fr' ? 'Bienvenue {{name}}' : 'Welcome {{name}}',
      ),
    };
    const service = new MailTemplateRenderService(i18n as any, 'en');
    const en = await service.render('welcome', 'en', { name: 'Ada', appName: 'App' });
    const fr = await service.render('welcome', 'fr', { name: 'Ada', appName: 'App' });
    expect(en.subject).toBe('Welcome Ada');
    expect(fr.subject).toBe('Bienvenue Ada');
    expect(en.body).toContain('Ada');
    expect(fr.body).toContain('Ada');
  });

  it('falls back to default locale for unknown locale', async () => {
    const i18n = {
      translate: vi.fn(async () => 'Welcome {{name}}'),
    };
    const service = new MailTemplateRenderService(i18n as any, 'en');
    const result = await service.render('welcome', 'zz', { name: 'Ada', appName: 'App' });
    expect(result.body).toContain('Welcome');
  });

  it('resolves default locale from a config object', async () => {
    const i18n = {
      translate: vi.fn(async (key: string, opts: any) =>
        opts?.lang === 'fr' ? 'Bonjour {{name}}' : 'Welcome {{name}}',
      ),
    };
    const service = new MailTemplateRenderService(i18n as any, { defaultLocale: 'fr' });
    const result = await service.render('welcome', 'zz', { name: 'Ada', appName: 'App' });
    expect(result.subject).toBe('Bonjour Ada');
  });

  it('uses the key as subject when translation throws', async () => {
    const i18n = {
      translate: vi.fn(async () => {
        throw new Error('missing');
      }),
    };
    const service = new MailTemplateRenderService(i18n as any, 'en');
    const result = await service.render('welcome', 'en', { name: 'Ada', appName: 'App' });
    expect(result.subject).toBe('welcome');
  });

  it('stringifies non-string translations', async () => {
    const i18n = {
      translate: vi.fn(async () => 42),
    };
    const service = new MailTemplateRenderService(i18n as any, 'en');
    const result = await service.render('welcome', 'en', { name: 'Ada', appName: 'App' });
    expect(result.subject).toBe('42');
  });

  it('defaults to en when no default locale is provided', async () => {
    const i18n = {
      translate: vi.fn(async () => 'Welcome {{name}}'),
    };
    const service = new MailTemplateRenderService(i18n as any, {} as any);
    const result = await service.render('welcome', 'zz', { name: 'Ada', appName: 'App' });
    expect(result.body).toContain('Welcome');
  });

  it('defaults to en when default locale is falsy', async () => {
    const i18n = {
      translate: vi.fn(async () => 'Welcome {{name}}'),
    };
    const service = new MailTemplateRenderService(i18n as any, { defaultLocale: '' } as any);
    const result = await service.render('welcome', 'zz', { name: 'Ada', appName: 'App' });
    expect(result.body).toContain('Welcome');
  });
});
