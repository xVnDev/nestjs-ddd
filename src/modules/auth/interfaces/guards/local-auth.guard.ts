/**
 * @file Local auth guard preserving Passport's 400 status for missing credentials.
 */

import { HttpException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  public handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: unknown,
    _context: unknown,
    status?: number,
  ): TUser {
    if (err) {
      throw err instanceof Error ? err : new HttpException(String(err), 500);
    }
    if (!user) {
      const message =
        typeof info === 'object' && info !== null && 'message' in info
          ? String((info as { message?: unknown }).message)
          : 'Unauthorized';
      throw new HttpException(message, status ?? 401);
    }
    return user;
  }
}
