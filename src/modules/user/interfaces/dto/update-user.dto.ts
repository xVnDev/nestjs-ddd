/**
 * @file Admin update-user DTO.
 */

import { ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { createSeededFaker } from '../../../../common/fixtures/seeded-faker.js';

@ApiTags('admin')
export class UpdateUserDto {
  private static readonly faker = createSeededFaker(2);

  @ApiProperty({
    example: UpdateUserDto.faker.internet.email(),
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: UpdateUserDto.faker.internet.password({ length: 12 }),
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ example: UpdateUserDto.faker.string.uuid(), required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[A-Za-z0-9:._@-]+$/)
  sub?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
