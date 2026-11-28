/**
 * @file Login DTO.
 */

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
} from 'class-validator';
import { createSeededFaker } from '../../../../common/fixtures/seeded-faker.js';

export class LoginDto {
  private static readonly faker = createSeededFaker(21);

  @ApiProperty({ example: LoginDto.faker.internet.email() })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: LoginDto.faker.internet.password({ length: 12 }),
  })
  @IsString()
  @MinLength(8)
  password!: string;
}

