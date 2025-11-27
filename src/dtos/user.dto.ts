import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from 'src/common/decorators/roles.decorator';
export class CreateUserDto {
  @IsNotEmpty() @MinLength(2)  @MaxLength(50) @IsString()
  name: string;

  @IsOptional() @IsEmail()
  email: string;

  @IsOptional() @MinLength(6)
  password: string;

  @MinLength(10) @MaxLength(15) @IsString()
  mobile?: string;

  @IsString()  @MaxLength(200)
  @IsOptional()
  address?: string;

  @IsEnum(['Admin', 'Customer'])
  @IsOptional()
  role?: Role;
}
