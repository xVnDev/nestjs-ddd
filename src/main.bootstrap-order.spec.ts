import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('main bootstrap order', () => {
  it('keeps pipes before security headers before shutdown hooks', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'main.ts'), 'utf8');
    const pipesIndex = source.indexOf('useGlobalPipes');
    const headersIndex = source.indexOf('useSecurityHeaders');
    const shutdownIndex = source.indexOf('enableShutdownHooks');

    expect(pipesIndex).toBeGreaterThan(-1);
    expect(headersIndex).toBeGreaterThan(pipesIndex);
    expect(shutdownIndex).toBeGreaterThan(headersIndex);
    expect(source).not.toMatch(/^\s*setupOpenApi\(app\)/m);
  });
});
