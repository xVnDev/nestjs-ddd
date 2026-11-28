/**
 * @file Unit tests for the auth controller.
 */

import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  it('delegates to the login use case and maps the result', async () => {
    const principal = { userId: 'user-1', email: 'user@example.com' } as any;
    const result = { principal, session: 'session-1' } as any;
    const loginUseCase = { execute: vi.fn().mockResolvedValue(result) };
    const controller = new AuthController(loginUseCase as any);

    const response = await controller.login({ user: principal } as any, {} as any);

    expect(loginUseCase.execute).toHaveBeenCalledWith(principal);
    expect(response).toMatchObject({ session: 'session-1' });
  });
});
