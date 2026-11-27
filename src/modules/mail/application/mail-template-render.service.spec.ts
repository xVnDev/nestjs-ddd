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
});