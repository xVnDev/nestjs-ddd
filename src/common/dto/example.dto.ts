import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { createSwaggerExamples } from '../fixtures/swagger-examples.js';

const examples = createSwaggerExamples();

export class ExampleDto {
  @ApiProperty({ example: examples.id, description: 'Unique identifier' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: examples.name })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: examples.email })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: examples.age })
  @IsInt()
  @Min(0)
  age!: number;

  @ApiProperty({
    example: examples.createdAt,
    description: 'Creation timestamp',
  })
  @IsOptional()
  @IsString()
  createdAt?: string;
}
