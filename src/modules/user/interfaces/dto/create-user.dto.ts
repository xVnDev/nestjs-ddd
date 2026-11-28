/**
 * @file Admin create-user DTO.
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
export class CreateUserDto {
  private static readonly faker = createSeededFaker(1);

  @ApiProperty({ example: CreateUserDto.faker.internet.email() })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: CreateUserDto.faker.internet.password({ length: 12 }),
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: CreateUserDto.faker.string.uuid(), required: false })
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
