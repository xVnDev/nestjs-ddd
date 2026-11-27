/**
 * @file Mail message spec.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('mail message', () => {
  it('carries only data', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/modules/mail/domain/mail-message.ts'),
      'utf8',
    );
    expect(source).not.toMatch(/@nestjs|nodemailer|handlebars|typeorm/i);
  });

  it('is assignable as a plain object', () => {
    const message = {
      to: 'a@b.com',
      subject: 'hi',
      template: 'welcome',
      locale: 'en',
      context: { name: 'Ada' },
    };
    expect(message.to).toBe('a@b.com');
  });
});