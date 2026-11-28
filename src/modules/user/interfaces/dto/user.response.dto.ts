/**
 * @file Admin user response DTO.
 */

import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('admin')
export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sub!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
