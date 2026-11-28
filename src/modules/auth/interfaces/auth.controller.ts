/**
 * @file Auth controller.
 */

import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { LoginUseCase } from '../use-cases/login.use-case.js';
import { LoginDto } from './dto/login.dto.js';
import { toAuthResponse } from './mappers/auth-response.mapper.js';
import type { AuthenticatedPrincipal } from '../domain/types/auth.types.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  public constructor(private readonly loginUseCase: LoginUseCase) {}

  @Post('login')
  @HttpCode(200)
  @UseGuards(LocalAuthGuard)
  public async login(
    @Req() req: { user: AuthenticatedPrincipal },
    @Body() _dto: LoginDto,
  ) {
    const result = await this.loginUseCase.execute(req.user);
    return toAuthResponse(result);
  }
}
