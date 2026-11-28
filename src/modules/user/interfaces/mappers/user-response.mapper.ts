/**
 * @file User response mapper.
 */

import { UserResponseDto } from '../dto/user.response.dto.js';
import type { User } from '../../domain/entities/user.entity.js';

export function toUserResponse(user: User): UserResponseDto {
  const dto = new UserResponseDto();
  dto.id = user.id;
  dto.sub = user.sub.toString();
  dto.email = user.email;
  dto.isActive = user.isActive;
  dto.createdAt = user.createdAt.toISOString();
  dto.updatedAt = user.updatedAt.toISOString();
  return dto;
}
