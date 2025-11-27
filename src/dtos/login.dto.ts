import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;

  @IsString()
  @MinLength(6) @MaxLength(50)
  password: string;
}

export class ChangePasswordDto {
  @IsEmail() email: string;

  @IsString()
  @MinLength(6) @MaxLength(50)
  password: string;
}
