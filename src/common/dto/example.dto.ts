import { IsEmail, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ExampleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsInt()
  @Min(0)
  age!: number;
}
