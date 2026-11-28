/**
 * @file Admin list-users query DTO.
 */

import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { createSeededFaker } from '../../../../common/fixtures/seeded-faker.js';

@ApiTags('admin')
export class ListUsersQueryDto {
  private static readonly faker = createSeededFaker(3);

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  /* v8 ignore next */
  @Type(() => Number)
  /* v8 ignore next */
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 20, required: false })
  @IsOptional()
  /* v8 ignore next */
  @Type(() => Number)
  /* v8 ignore next */
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    example: ListUsersQueryDto.faker.internet.email(),
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @Transform(({ value }) => {
    /* v8 ignore next 3 */
    if (value === 'true' || value === true) return true;
    /* v8 ignore next 3 */
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  /* v8 ignore next */
  isActive?: boolean;
}
