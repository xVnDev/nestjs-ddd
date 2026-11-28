/**
 * @file Unit tests for auth config.
 */

import { describe, expect, it } from 'vitest';
import { authConfig } from './auth.config.js';

describe('authConfig', () => {
  it('returns typed RS256 values', () => {
    const cfg = authConfig();
    expect(cfg.algorithm).toBe('RS256');
    expect(cfg.issuer).toBeTruthy();
    expect(cfg.audience).toBeTruthy();
    expect(cfg.accessTtl).toBeTruthy();
    expect(cfg.refreshTtl).toBeTruthy();
    expect(cfg.privateKeyPath).toBeTruthy();
    expect(cfg.publicKeyPath).toBeTruthy();
  });
});
