/**
 * @file Admin user controller.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../auth/interfaces/guards/roles.guard.js';
import { Roles } from '../../auth/interfaces/decorators/roles.decorator.js';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case.js';
import { DeleteUserUseCase } from '../application/use-cases/delete-user.use-case.js';
import { GetUserUseCase } from '../application/use-cases/get-user.use-case.js';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case.js';
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users.query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto } from './dto/user.response.dto.js';
import { toUserResponse } from './mappers/user-response.mapper.js';

@ApiTags('admin')
@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles('admin')
export class AdminUserController {
  public constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly deleteUser: DeleteUserUseCase,
  ) {}

  @Post()
  public async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.createUser.execute(dto);
    return toUserResponse(user);
  }

  @Get(':id')
  public async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.getUser.execute(id);
    return toUserResponse(user);
  }

  @Get()
  public async findAll(@Query() query: ListUsersQueryDto): Promise<{
    items: UserResponseDto[];
    total: number;
  }> {
    const { items, total } = await this.listUsers.execute(query);
    return { items: items.map(toUserResponse), total };
  }

  @Patch(':id')
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.updateUser.execute(id, dto);
    return toUserResponse(user);
  }

  @Delete(':id')
  @HttpCode(204)
  public async remove(@Param('id') id: string): Promise<void> {
    await this.deleteUser.execute(id);
  }
}
