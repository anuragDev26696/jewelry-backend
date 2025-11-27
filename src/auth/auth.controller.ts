import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginResponse } from 'src/common/interface/generic.interface';
import { ChangePasswordDto, LoginDto } from 'src/dtos/login.dto';
import { User } from 'src/schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponse> {
    return await this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('change-password')
  async changePassword(@Body() loginDto: ChangePasswordDto): Promise<User> {
    return await this.authService.changePassword(loginDto.email, loginDto.password);
  }
}
